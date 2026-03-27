# frozen_string_literal: true

module Temple
  module Devtools
    class Railtie < Rails::Railtie
      initializer "temple_devtools.configure", before: :load_config_initializers do
        Temple::Devtools.configure do |config|
          config.debug_mode = Rails.env.development?
          config.project_root = Rails.root.to_s
        end
      end

      initializer "temple_devtools.install", after: :load_config_initializers do
        Temple::Devtools.install!
      end

      initializer "temple_devtools.middleware" do |app|
        if Temple::Devtools.config.debug_mode && Temple::Devtools.config.inject_overlay
          app.middleware.insert_before ActionDispatch::ShowExceptions, Temple::Devtools::Middleware
        end
      end
    end
  end
end
