# frozen_string_literal: true

module Temple
  module Devtools
    module HamlTagCompilerExtension
      include TemplateType

      def initialize(identity, options)
        @devtools_filename = options[:filename] || "unknown"
        super
      end

      def compile(node, &block)
        result = super
        return result unless Temple::Devtools.config.debug_mode

        inject_debug_attrs(result, node)
      end

      private

      def inject_debug_attrs(temple, node)
        attrs = temple[3]
        return temple unless attrs.is_a?(Array) && attrs[0] == :html && attrs[1] == :attrs

        filename = @devtools_filename.dup
        root = Temple::Devtools.config.project_root
        if root && filename.start_with?(root)
          filename = filename.delete_prefix(root).delete_prefix("/")
        end

        debug_attrs = [
          [:html, :attr, "data-devtools-file", [:static, filename]],
          [:html, :attr, "data-devtools-line", [:static, node.line.to_s]],
          [:html, :attr, "data-devtools-type", [:static, template_type(filename)]]
        ]

        temple[3] = [:html, :attrs, *attrs[2..], *debug_attrs]
        temple
      end
    end
  end
end
