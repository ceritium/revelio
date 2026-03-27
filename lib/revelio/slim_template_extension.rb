# frozen_string_literal: true

module Revelio
  module SlimTemplateExtension
    include TemplateType

    def call(template, source = nil)
      compiled = super
      return compiled unless Revelio.config.debug_mode

      relative, type, short = resolve_template_info(template)

      preamble = %{<!-- revelio-begin file="#{relative}" type="#{type}" short="#{short}" -->}
      postamble = %{<!-- revelio-end file="#{relative}" -->}

      # Insert preamble AFTER buffer initialization, postamble at the end
      result = compiled.sub(
        "@output_buffer = output_buffer || ActionView::OutputBuffer.new;",
        "@output_buffer = output_buffer || ActionView::OutputBuffer.new; @output_buffer.safe_append='#{preamble}';"
      )
      "#{result}\n@output_buffer.safe_append='#{postamble}';\n@output_buffer"
    end
  end
end
