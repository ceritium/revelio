# frozen_string_literal: true

require "json"

module Temple
  module Devtools
    class Middleware
      def initialize(app)
        @app = app
      end

      def call(env)
        ensure_installed!

        metrics = collect_metrics do
          @status, @headers, @response = @app.call(env)
        end

        return [@status, @headers, @response] unless injectable?(@status, @headers)

        body = +""
        @response.each { |chunk| body << chunk }
        @response.close if @response.respond_to?(:close)

        if body.include?("</body>")
          body.sub!("</body>", "#{devtools_injection(metrics)}\n</body>")
          @headers["content-length"] = body.bytesize.to_s if @headers["content-length"]
        end

        [@status, @headers, [body]]
      end

      private

      # Subscriber that tracks render start/finish with a stack
      # to attribute queries and GC to each render.
      class RenderSubscriber
        attr_reader :renders

        def initialize(query_log)
          @query_log = query_log
          @stack = []
          @renders = []
        end

        def start(_name, _id, payload)
          @stack.push({
            template: resolve_id(payload),
            query_index: @query_log.size,
            gc_start: GC.stat(:total_allocated_objects),
            time_start: Process.clock_gettime(Process::CLOCK_MONOTONIC)
          })
        end

        def finish(_name, _id, _payload)
          ctx = @stack.pop
          return unless ctx

          duration = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - ctx[:time_start]) * 1000).round(2)
          queries_during = @query_log[ctx[:query_index]..]
          gc_delta = GC.stat(:total_allocated_objects) - ctx[:gc_start]

          @renders << {
            template: ctx[:template],
            duration: duration,
            queries: queries_during.size,
            query_time: queries_during.sum { |q| q[:duration] }.round(1),
            gc_objects: gc_delta
          }
        end

        private

        def resolve_id(payload)
          id = payload[:identifier] || payload[:name] || ""
          root = Temple::Devtools.config.project_root
          id = id.delete_prefix(root).delete_prefix("/") if root && id.start_with?(root.to_s)
          id
        end
      end

      def collect_metrics
        all_queries = []
        subscribers = []

        if defined?(ActiveSupport::Notifications)
          # SQL tracking — Rails 8.1 passes a single Event object
          subscribers << ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
            next if event.payload[:name] == "SCHEMA"
            all_queries << {
              name: event.payload[:name],
              duration: event.duration.round(2),
              allocations: event.allocations
            }
          end

          # Render tracking with start/finish stack
          render_tracker = RenderSubscriber.new(all_queries)
          %w[render_template.action_view render_partial.action_view render.view_component].each do |event|
            subscribers << ActiveSupport::Notifications.subscribe(event, render_tracker)
          end
        end

        gc_before = GC.stat(:total_allocated_objects)
        start = Process.clock_gettime(Process::CLOCK_MONOTONIC)

        yield

        duration = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round(1)
        gc_allocated = GC.stat(:total_allocated_objects) - gc_before

        subscribers.compact.each { |s| ActiveSupport::Notifications.unsubscribe(s) }

        renders = defined?(render_tracker) ? render_tracker.renders : []
        query_time = all_queries.sum { |q| q[:duration] }

        {
          duration: duration,
          queries: all_queries.size,
          query_time: query_time.round(1),
          renders: renders.size,
          render_time: renders.sum { |r| r[:duration] }.round(1),
          gc_objects: gc_allocated,
          thresholds: Temple::Devtools.config.thresholds,
          details: {
            queries: all_queries.first(50),
            renders: renders
          }
        }
      end

      def ensure_installed!
        return if @extensions_installed

        Temple::Devtools.install!
        @extensions_installed = true
      end

      def injectable?(status, headers)
        status == 200 &&
          !headers["content-disposition"]&.start_with?("attachment") &&
          headers["content-type"]&.include?("text/html")
      end

      def devtools_injection(metrics)
        meta = "<meta name=\"temple-project-path\" content=\"#{Temple::Devtools.config.project_root}\">"
        metrics_tag = "<script type=\"application/json\" id=\"temple-devtools-metrics\">#{metrics.to_json}</script>"
        "#{meta}\n#{metrics_tag}\n#{self.class.devtools_script}"
      end

      def self.devtools_script
        js = File.read(File.expand_path("overlay.js", __dir__))
        "<script id=\"temple-devtools\">\n#{js}\n</script>"
      end
    end
  end
end
