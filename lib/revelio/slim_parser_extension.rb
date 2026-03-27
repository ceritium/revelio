# frozen_string_literal: true

module Revelio
  module SlimParserExtension
    include TemplateType

    def call(source)
      result = super
      return result unless Revelio.config.debug_mode

      filename = options[:file] || "unknown"
      root = Revelio.config.project_root
      if root && filename.start_with?(root)
        filename = filename.delete_prefix(root).delete_prefix("/")
      end

      type = template_type(filename)
      inject_debug_attrs(result, filename, type, [1])
    end

    private

    def inject_debug_attrs(exp, filename, type, line_ref)
      return exp unless exp.is_a?(Array)

      case exp[0]
      when :newline
        line_ref[0] += 1
      when :html
        if exp[1] == :tag
          attrs = exp[3]
          if attrs.is_a?(Array) && attrs[0] == :html && attrs[1] == :attrs
            debug_attrs = [
              [:html, :attr, "data-revelio-file", [:static, filename]],
              [:html, :attr, "data-revelio-line", [:static, line_ref[0].to_s]],
              [:html, :attr, "data-revelio-type", [:static, type]]
            ]
            exp[3] = [:html, :attrs, *attrs[2..], *debug_attrs]
          end
        end
      end

      exp.each { |child| inject_debug_attrs(child, filename, type, line_ref) if child.is_a?(Array) }
      exp
    end
  end
end
