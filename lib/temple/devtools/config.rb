# frozen_string_literal: true

module Temple
  module Devtools
    class Config
      attr_accessor :debug_mode, :project_root, :inject_overlay,
                    :duration_threshold, :queries_threshold, :gc_objects_threshold

      def initialize
        @debug_mode = false
        @project_root = nil
        @inject_overlay = true
        @duration_threshold = 200
        @queries_threshold = 20
        @gc_objects_threshold = 100_000
      end

      def thresholds
        {
          duration: @duration_threshold,
          queries: @queries_threshold,
          gc_objects: @gc_objects_threshold
        }
      end
    end
  end
end
