# frozen_string_literal: true

require "json"
require_relative "render_subscriber"

module Revelio
  class Middleware
    def initialize(app)
      @app = app
    end

    def call(env)
      ensure_installed!

      status = nil
      headers = nil
      response = nil

      metrics = collect_metrics do
        status, headers, response = @app.call(env)
      end

      return [status, headers, response] unless injectable?(status, headers)

      body = +""
      response.each { |chunk| body << chunk }
      response.close if response.respond_to?(:close)

      if body.include?("</body>")
        body.sub!("</body>", "#{devtools_injection(metrics)}\n</body>")
        headers["content-length"] = body.bytesize.to_s if headers["content-length"]
      end

      [status, headers, [body]]
    end

    private

    def collect_metrics
      all_queries = []
      subscribers = []

      if defined?(ActiveSupport::Notifications)
        # SQL tracking -- Rails 8.1 passes a single Event object
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
        thresholds: Revelio.config.thresholds,
        details: {
          queries: all_queries.first(50),
          renders: renders
        }
      }
    end

    def ensure_installed!
      # Always call install! — it's idempotent per-engine and handles
      # late-defined constants like Slim::RailsTemplate
      Revelio.install!
    end

    def injectable?(status, headers)
      status == 200 &&
        !headers["content-disposition"]&.start_with?("attachment") &&
        headers["content-type"]&.include?("text/html")
    end

    def devtools_injection(metrics)
      meta = "<meta name=\"revelio-project-path\" content=\"#{Revelio.config.project_root}\">"
      metrics_tag = "<script type=\"application/json\" id=\"revelio-metrics\">#{metrics.to_json}</script>"
      "#{meta}\n#{metrics_tag}\n#{self.class.devtools_script}"
    end

    def self.devtools_script
      js = File.read(File.expand_path("overlay.js", __dir__))
      "<script id=\"revelio\">\n#{js}\n</script>"
    end
  end
end
