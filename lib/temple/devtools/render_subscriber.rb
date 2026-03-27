# frozen_string_literal: true

module Temple
  module Devtools
    # Subscriber that tracks render start/finish with a stack
    # to attribute queries and GC to each render.
    class RenderSubscriber
      include TemplateType

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
        identifier = payload[:identifier] || payload[:name] || ""

        # ViewComponent reports the .rb file as identifier.
        # Match it to the actual template file for boundary correlation.
        if identifier.end_with?(".rb")
          template = Dir.glob("#{identifier.chomp('.rb')}.html.*").first
          identifier = template if template
        end

        resolve_template_info(identifier).first
      end
    end
  end
end
