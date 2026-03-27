# frozen_string_literal: true

module Temple
  module Devtools
    class Config
      attr_accessor :debug_mode, :project_root, :inject_overlay

      def initialize
        @debug_mode = false
        @project_root = nil
        @inject_overlay = true
      end
    end
  end
end
