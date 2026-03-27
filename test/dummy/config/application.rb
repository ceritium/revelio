# frozen_string_literal: true

require "rails"
require "action_controller/railtie"
require "action_view/railtie"
require "active_record/railtie"

Bundler.require(*Rails.groups) if defined?(Bundler)

class DummyApp < Rails::Application
  config.eager_load = false
  config.secret_key_base = "revelio-dummy-secret"
  config.hosts.clear
  config.root = File.expand_path("..", __dir__)

  config.public_file_server.enabled = true
  config.autoload_paths << File.expand_path("../app/components", __dir__)

end
