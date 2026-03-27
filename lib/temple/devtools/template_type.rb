# frozen_string_literal: true

module Temple
  module Devtools
    module TemplateType
      def template_type(filename)
        basename = File.basename(filename)
        if filename.match?(%r{(^|/)components/})
          "component"
        elsif basename.start_with?("_")
          "partial"
        elsif filename.match?(%r{(^|/)layouts/})
          "layout"
        else
          "view"
        end
      end
    end
  end
end
