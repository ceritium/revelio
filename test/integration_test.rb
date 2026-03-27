# frozen_string_literal: true

ENV["RAILS_ENV"] = "test"

require_relative "dummy/config/boot"
require "rails"
require "action_controller/railtie"
require "action_view/railtie"
require "view_component"
require "haml/rails_template"
require "slim"

# Register Slim template handler (normally done by Slim's railtie)
unless defined?(Slim::RailsTemplate)
  Slim::RailsTemplate = Temple::Templates::Rails(
    Slim::Engine, register_as: :slim,
    use_html_safe: true,
    streaming: true,
    generator: Temple::Generators::RailsOutputBuffer,
    buffer: "@output_buffer"
  )
end

require "temple/devtools"
require "minitest/autorun"

require_relative "dummy/config/application"

DummyApp.config.middleware.use Temple::Devtools::Middleware
DummyApp.config.view_component.preview_paths = []
DummyApp.initialize! unless DummyApp.initialized?

DUMMY_ROOT = File.expand_path("dummy", __dir__)

Temple::Devtools.configure do |c|
  c.debug_mode = true
  c.project_root = DUMMY_ROOT
end
Temple::Devtools.install!

require_relative "dummy/app/components/badge_component"
require_relative "dummy/app/controllers/pages_controller"

PagesController.view_paths = [File.join(DUMMY_ROOT, "app/views")]
PagesController.append_view_path File.join(DUMMY_ROOT, "app/components")
PagesController.layout "application"

require_relative "dummy/config/routes"

class HamlIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Temple::Devtools.config.debug_mode = true
    Temple::Devtools.install!
  end

  test "renders with data attributes" do
    get "/haml"
    assert_response :success
    assert_includes response.body, 'data-devtools-file='
    assert_includes response.body, 'data-devtools-line="1"'
    assert_includes response.body, 'data-devtools-type="view"'
  end

  test "injects comment markers" do
    get "/haml"
    assert_includes response.body, "temple-devtools-begin"
    assert_includes response.body, "temple-devtools-end"
    assert_includes response.body, 'type="view"'
  end

  test "injects devtools script" do
    get "/haml"
    assert_includes response.body, '<script id="temple-devtools">'
  end

  test "partial detected" do
    get "/haml/partial"
    assert_includes response.body, 'type="partial"'
    assert_includes response.body, 'data-devtools-type="partial"'
  end

  test "component detected" do
    get "/haml/component"
    assert_includes response.body, 'type="component"'
    assert_includes response.body, 'data-devtools-type="component"'
  end
end

class SlimIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Temple::Devtools.config.debug_mode = true
    Temple::Devtools.install!
  end

  test "renders with data attributes" do
    get "/slim"
    assert_response :success
    assert_includes response.body, 'data-devtools-file='
    assert_includes response.body, 'data-devtools-type="view"'
  end

  test "injects comment markers" do
    get "/slim"
    assert_includes response.body, "temple-devtools-begin"
    assert_includes response.body, "temple-devtools-end"
  end

  test "partial detected" do
    get "/slim/partial"
    assert_includes response.body, 'type="partial"'
    assert_includes response.body, 'data-devtools-type="partial"'
  end
end

class ErbIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Temple::Devtools.config.debug_mode = true
    Temple::Devtools.install!
  end

  test "injects comment markers" do
    get "/erb"
    assert_response :success
    assert_includes response.body, "temple-devtools-begin"
    assert_includes response.body, "temple-devtools-end"
    assert_includes response.body, 'type="view"'
  end

  test "no data attributes on elements (ERB is not HTML-aware)" do
    get "/erb"
    html_before_script = response.body.split('<script id="temple-devtools">').first
    refute_includes html_before_script, "data-devtools-file"
  end

  test "partial comment markers" do
    get "/erb/partial"
    assert_includes response.body, 'type="partial"'
    assert_includes response.body, 'type="view"'
  end

  test "injects devtools script" do
    get "/erb"
    assert_includes response.body, '<script id="temple-devtools">'
  end
end
