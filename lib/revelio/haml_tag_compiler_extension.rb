# frozen_string_literal: true

module Revelio
  module HamlTagCompilerExtension
    include TemplateType

    def initialize(identity, options)
      @revelio_filename = options[:filename] || "unknown"
      super
    end

    def compile(node, &block)
      result = super
      return result unless Revelio.config.debug_mode

      inject_debug_attrs(result, node)
    end

    private

    def inject_debug_attrs(temple, node)
      attrs = temple[3]
      return temple unless attrs.is_a?(Array) && attrs[0] == :html && attrs[1] == :attrs

      filename = @revelio_filename.dup
      root = Revelio.config.project_root
      if root && filename.start_with?(root)
        filename = filename.delete_prefix(root).delete_prefix("/")
      end

      debug_attrs = [
        [:html, :attr, "data-revelio-file", [:static, filename]],
        [:html, :attr, "data-revelio-line", [:static, node.line.to_s]],
        [:html, :attr, "data-revelio-type", [:static, template_type(filename)]]
      ]

      temple[3] = [:html, :attrs, *attrs[2..], *debug_attrs]
      temple
    end
  end
end
