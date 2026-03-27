# frozen_string_literal: true

module Temple
  module Devtools
    module HamlTemplateExtension
      include TemplateType

      def call(template, source = nil)
        return super unless Temple::Devtools.config.debug_mode

        source ||= template.source
        options = Haml::RailsTemplate.options

        if template.respond_to?(:identifier)
          options = options.merge(filename: template.identifier)
        end

        if template.respond_to?(:type) && template.type == "text/xml"
          options = options.merge(format: :xhtml)
        end

        relative, type, short = resolve_template_info(template)

        preamble_parts = []
        postamble_parts = []

        if ActionView::Base.try(:annotate_rendered_view_with_filenames) && template.format == :html
          preamble_parts << "<!-- BEGIN #{template.short_identifier} -->"
          postamble_parts << "<!-- END #{template.short_identifier} -->"
        end

        marker_attrs = "file=\"#{relative}\" type=\"#{type}\" short=\"#{short}\""
        preamble_parts << "<!-- temple-devtools-begin #{marker_attrs} -->"
        postamble_parts.unshift("<!-- temple-devtools-end file=\"#{relative}\" -->")

        options = options.merge(
          preamble: preamble_parts.join("\n"),
          postamble: postamble_parts.join("\n")
        )

        Haml::Engine.new(options).call(source)
      end
    end
  end
end
