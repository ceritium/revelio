# frozen_string_literal: true

module Temple
  module Devtools
    class Railtie < Rails::Railtie
      initializer "temple_devtools.configure", before: :load_config_initializers do |app|
        Temple::Devtools.configure do |config|
          config.debug_mode = Rails.env.development?
          config.project_root = Rails.root.to_s
        end

        # Enable ViewComponent instrumentation so we can capture render times
        if defined?(ViewComponent) && Rails.env.development?
          app.config.view_component.instrumentation_enabled = true
        end
      end

      initializer "temple_devtools.middleware" do |app|
        if Temple::Devtools.config.debug_mode && Temple::Devtools.config.inject_overlay
          app.middleware.insert_before ActionDispatch::ShowExceptions, Temple::Devtools::Middleware
        end
      end
    end
  end
end
