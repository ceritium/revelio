# frozen_string_literal: true

module Revelio
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

    # Resolves a template object (or raw identifier string) into
    # [relative_path, type, short_name].
    def resolve_template_info(template)
      identifier = if template.respond_to?(:identifier)
                     template.identifier
                   elsif template.is_a?(String)
                     template
                   else
                     "unknown"
                   end

      relative = identifier.dup
      root = Revelio.config.project_root
      if root && relative.start_with?(root.to_s)
        relative = relative.delete_prefix(root.to_s).delete_prefix("/")
      end

      type = template_type(relative)
      short = File.basename(relative)
      [relative, type, short]
    end
  end
end
