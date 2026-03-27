# frozen_string_literal: true

require "temple"
require_relative "devtools/version"
require_relative "devtools/config"
require_relative "devtools/template_type"
require_relative "devtools/haml_tag_compiler_extension"
require_relative "devtools/haml_template_extension"
require_relative "devtools/slim_parser_extension"
require_relative "devtools/slim_template_extension"
require_relative "devtools/erb_template_extension"
require_relative "devtools/middleware"

module Temple
  module Devtools
    class << self
      def config
        @config ||= Config.new
      end

      def configure
        yield config
      end

      def install!
        install_haml!
        install_slim!
        install_erb!
      end

      def installed_engines
        engines = []
        engines << :haml if defined?(Haml::Compiler::TagCompiler) && prepended?(Haml::Compiler::TagCompiler, HamlTagCompilerExtension)
        engines << :slim if defined?(Slim::Parser) && prepended?(Slim::Parser, SlimParserExtension)
        engines << :erb if defined?(ActionView::Template::Handlers::ERB) && prepended?(ActionView::Template::Handlers::ERB, ErbTemplateExtension)
        engines
      end

      private

      def prepended?(klass, mod)
        klass.ancestors.include?(mod)
      end

      def install_haml!
        if defined?(Haml::Compiler::TagCompiler) && !prepended?(Haml::Compiler::TagCompiler, HamlTagCompilerExtension)
          Haml::Compiler::TagCompiler.prepend(HamlTagCompilerExtension)
        end
        if defined?(Haml::RailsTemplate) && !prepended?(Haml::RailsTemplate, HamlTemplateExtension)
          Haml::RailsTemplate.prepend(HamlTemplateExtension)
        end
      end

      def install_slim!
        if defined?(Slim::Parser) && !prepended?(Slim::Parser, SlimParserExtension)
          Slim::Parser.prepend(SlimParserExtension)
        end
        if defined?(Slim::RailsTemplate) && !prepended?(Slim::RailsTemplate, SlimTemplateExtension)
          Slim::RailsTemplate.prepend(SlimTemplateExtension)
        end
      end

      def install_erb!
        if defined?(ActionView::Template::Handlers::ERB) && !prepended?(ActionView::Template::Handlers::ERB, ErbTemplateExtension)
          ActionView::Template::Handlers::ERB.prepend(ErbTemplateExtension)
        end
      end
    end
  end
end

require_relative "devtools/railtie" if defined?(Rails::Railtie)
