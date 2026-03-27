# frozen_string_literal: true

module Temple
  module Devtools
    module SlimTemplateExtension
      include TemplateType

      def call(template, source = nil)
        compiled = super
        return compiled unless Temple::Devtools.config.debug_mode

        identifier = template.respond_to?(:identifier) ? template.identifier : "unknown"
        relative = identifier.dup
        root = Temple::Devtools.config.project_root
        if root && relative.start_with?(root)
          relative = relative.delete_prefix(root).delete_prefix("/")
        end

        type = template_type(relative)
        short = File.basename(relative)

        preamble = %{<!-- temple-devtools-begin file="#{relative}" type="#{type}" short="#{short}" -->}
        postamble = %{<!-- temple-devtools-end file="#{relative}" -->}

        # Insert preamble AFTER buffer initialization, postamble at the end
        result = compiled.sub(
          "@output_buffer = output_buffer || ActionView::OutputBuffer.new;",
          "@output_buffer = output_buffer || ActionView::OutputBuffer.new; @output_buffer.safe_append='#{preamble}';"
        )
        "#{result}\n@output_buffer.safe_append='#{postamble}';\n@output_buffer"
      end
    end
  end
end
