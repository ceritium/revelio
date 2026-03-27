# frozen_string_literal: true

module Temple
  module Devtools
    class Middleware
      def initialize(app)
        @app = app
      end

      def call(env)
        ensure_installed!
        status, headers, response = @app.call(env)
        return [status, headers, response] unless injectable?(status, headers)

        body = +""
        response.each { |chunk| body << chunk }
        response.close if response.respond_to?(:close)

        if body.include?("</body>")
          body.sub!("</body>", "#{devtools_injection}\n</body>")
          headers["content-length"] = body.bytesize.to_s if headers["content-length"]
        end

        [status, headers, [body]]
      end

      private

      def ensure_installed!
        return if @extensions_installed

        Temple::Devtools.install!
        @extensions_installed = true
      end

      def injectable?(status, headers)
        status == 200 &&
          !headers["content-disposition"]&.start_with?("attachment") &&
          headers["content-type"]&.include?("text/html")
      end

      def devtools_injection
        meta = "<meta name=\"temple-project-path\" content=\"#{Temple::Devtools.config.project_root}\">"
        "#{meta}\n#{self.class.devtools_script}"
      end

      def self.devtools_script
        js = File.read(File.expand_path("overlay.js", __dir__))
        "<script id=\"temple-devtools\">\n#{js}\n</script>"
      end
    end
  end
end
