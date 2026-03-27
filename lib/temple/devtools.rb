# frozen_string_literal: true

require "temple"
require_relative "devtools/version"
require_relative "devtools/config"
require_relative "devtools/template_type"
require_relative "devtools/middleware"

# Engine-specific extensions (loaded lazily in install!)
autoload_dir = File.expand_path("devtools", __dir__)

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
        engines << :haml if @haml_installed
        engines << :slim if @slim_installed
        engines << :erb if @erb_installed
        engines
      end

      private

      def install_haml!
        if defined?(Haml::Compiler::TagCompiler) && !@haml_tag_installed
          require_relative "devtools/haml_tag_compiler_extension"
          Haml::Compiler::TagCompiler.prepend(HamlTagCompilerExtension)
          @haml_tag_installed = true
        end

        if defined?(Haml::RailsTemplate) && !@haml_template_installed
          require_relative "devtools/haml_template_extension"
          Haml::RailsTemplate.prepend(HamlTemplateExtension)
          @haml_template_installed = true
        end

        @haml_installed = @haml_tag_installed
      end

      def install_slim!
        if defined?(Slim::Parser) && !@slim_parser_installed
          require_relative "devtools/slim_parser_extension"
          Slim::Parser.prepend(SlimParserExtension)
          @slim_parser_installed = true
        end

        if defined?(Slim::RailsTemplate) && !@slim_template_installed
          require_relative "devtools/slim_template_extension"
          Slim::RailsTemplate.prepend(SlimTemplateExtension)
          @slim_template_installed = true
        end

        @slim_installed = @slim_parser_installed
      end

      def install_erb!
        if defined?(ActionView::Template::Handlers::ERB) && !@erb_installed
          require_relative "devtools/erb_template_extension"
          ActionView::Template::Handlers::ERB.prepend(ErbTemplateExtension)
          @erb_installed = true
        end
      end
    end
  end
end

require_relative "devtools/railtie" if defined?(Rails::Railtie)
