# frozen_string_literal: true

module Revelio
  module ErbTemplateExtension
    include TemplateType

    def call(template, source = nil)
      compiled = super
      return compiled unless Revelio.config.debug_mode
      return compiled unless template.format == :html

      relative, type, short = resolve_template_info(template)

      preamble = %{<!-- revelio-begin file="#{relative}" type="#{type}" short="#{short}" -->}
      postamble = %{<!-- revelio-end file="#{relative}" -->}

      # ERB's output buffer is already initialized by ActionView before the template runs
      "@output_buffer.safe_append='#{preamble}';#{compiled}\n@output_buffer.safe_append='#{postamble}';\n@output_buffer"
    end
  end
end
