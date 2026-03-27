# frozen_string_literal: true

module Revelio
  class Railtie < Rails::Railtie
    initializer "revelio.configure", before: :load_config_initializers do |app|
      Revelio.configure do |config|
        config.debug_mode = Rails.env.development?
        config.project_root = Rails.root.to_s
      end

      # Enable ViewComponent instrumentation so we can capture render times
      if defined?(ViewComponent) && Rails.env.development?
        app.config.view_component.instrumentation_enabled = true
      end
    end

    initializer "revelio.middleware" do |app|
      if Revelio.config.debug_mode && Revelio.config.inject_overlay
        app.middleware.insert_before ActionDispatch::ShowExceptions, Revelio::Middleware
      end
    end
  end
end
