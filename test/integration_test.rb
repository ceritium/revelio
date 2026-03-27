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

require "revelio"
require "minitest/autorun"

require_relative "dummy/config/application"

DummyApp.config.middleware.use Revelio::Middleware
DummyApp.config.view_component.preview_paths = []
DummyApp.initialize! unless DummyApp.initialized?

DUMMY_ROOT = File.expand_path("dummy", __dir__)

Revelio.configure do |c|
  c.debug_mode = true
  c.project_root = DUMMY_ROOT
end
Revelio.install!

require_relative "dummy/app/components/badge_component"
require_relative "dummy/app/controllers/pages_controller"

PagesController.view_paths = [File.join(DUMMY_ROOT, "app/views")]
PagesController.append_view_path File.join(DUMMY_ROOT, "app/components")
PagesController.layout "application"

require_relative "dummy/config/routes"

class HamlIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Revelio.config.debug_mode = true
    Revelio.install!
  end

  test "renders with data attributes" do
    get "/haml"
    assert_response :success
    assert_includes response.body, 'data-revelio-file='
    assert_includes response.body, 'data-revelio-line="1"'
    assert_includes response.body, 'data-revelio-type="view"'
  end

  test "injects comment markers" do
    get "/haml"
    assert_includes response.body, "revelio-begin"
    assert_includes response.body, "revelio-end"
    assert_includes response.body, 'type="view"'
  end

  test "injects devtools script" do
    get "/haml"
    assert_includes response.body, '<script id="revelio">'
  end

  test "partial detected" do
    get "/haml/partial"
    assert_includes response.body, 'type="partial"'
    assert_includes response.body, 'data-revelio-type="partial"'
  end

  test "component detected" do
    get "/haml/component"
    assert_includes response.body, 'type="component"'
    assert_includes response.body, 'data-revelio-type="component"'
  end
end

class SlimIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Revelio.config.debug_mode = true
    Revelio.install!
  end

  test "renders with data attributes" do
    get "/slim"
    assert_response :success
    assert_includes response.body, 'data-revelio-file='
    assert_includes response.body, 'data-revelio-type="view"'
  end

  test "injects comment markers" do
    get "/slim"
    assert_includes response.body, "revelio-begin"
    assert_includes response.body, "revelio-end"
  end

  test "partial detected" do
    get "/slim/partial"
    assert_includes response.body, 'type="partial"'
    assert_includes response.body, 'data-revelio-type="partial"'
  end
end

class ErbIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Revelio.config.debug_mode = true
    Revelio.install!
  end

  test "injects comment markers" do
    get "/erb"
    assert_response :success
    assert_includes response.body, "revelio-begin"
    assert_includes response.body, "revelio-end"
    assert_includes response.body, 'type="view"'
  end

  test "no data attributes on elements (ERB is not HTML-aware)" do
    get "/erb"
    html_before_script = response.body.split('<script id="revelio">').first
    refute_includes html_before_script, "data-revelio-file"
  end

  test "partial comment markers" do
    get "/erb/partial"
    assert_includes response.body, 'type="partial"'
    assert_includes response.body, 'type="view"'
  end

  test "injects devtools script" do
    get "/erb"
    assert_includes response.body, '<script id="revelio">'
  end
end

class MixedEngineIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Revelio.config.debug_mode = true
    Revelio.install!
  end

  test "haml view renders erb and slim partials" do
    get "/haml/mixed"
    assert_response :success
    body = response.body
    # View is HAML
    assert_includes body, 'data-revelio-type="view"'
    assert_includes body, "mixed.html.haml"
    # ERB partial markers
    assert_includes body, '_card.html.erb'
    # Slim partial markers
    assert_includes body, '_card.html.slim'
    # HAML partial with data attrs
    assert_includes body, 'data-revelio-type="partial"'
  end

  test "slim view renders erb and haml partials" do
    get "/slim/mixed"
    assert_response :success
    body = response.body
    assert_includes body, "mixed.html.slim"
    assert_includes body, '_card.html.erb'
    assert_includes body, '_card.html.haml'
  end

  test "erb view renders haml and slim partials" do
    get "/erb/mixed"
    assert_response :success
    body = response.body
    assert_includes body, "mixed.html.erb"
    assert_includes body, '_card.html.haml'
    assert_includes body, '_card.html.slim'
  end

  test "all three engines coexist with correct type detection" do
    get "/haml/mixed"
    body = response.body
    assert_includes body, 'type="view"'
    assert_includes body, 'type="partial"'
  end
end

class TurboIntegrationTest < ActionDispatch::IntegrationTest
  setup do
    Revelio.config.debug_mode = true
    Revelio.install!
  end

  test "turbo page has devtools markers and data attributes" do
    get "/haml/turbo"
    assert_response :success
    assert_includes response.body, "revelio-begin"
    assert_includes response.body, 'type="view"'
    assert_includes response.body, 'data-revelio-type="view"'
    assert_includes response.body, "turbo.html.haml"
  end

  test "turbo frame response has devtools markers" do
    get "/haml/turbo_frame"
    assert_response :success
    body = response.body
    assert_includes body, "revelio-begin"
    assert_includes body, 'type="view"'
    assert_includes body, 'type="partial"'
    assert_includes body, ".html.haml"
  end

  test "turbo frame response has data attributes on elements" do
    get "/haml/turbo_frame"
    body = response.body
    assert_includes body, 'data-revelio-file='
    assert_includes body, 'data-revelio-type="partial"'
  end

  test "turbo stream response has devtools markers" do
    get "/haml/turbo_stream"
    assert_response :success
    body = response.body
    # Turbo stream is text/vnd.turbo-stream.html, not text/html
    # So the middleware does NOT inject the script (correct behavior)
    refute_includes body, '<script id="revelio">'
    # But the template markers ARE in the compiled output
    assert_includes body, "revelio-begin"
    assert_includes body, "turbo_stream.html.haml"
  end

  test "turbo stream has data attributes on elements" do
    get "/haml/turbo_stream"
    body = response.body
    assert_includes body, 'data-revelio-file='
    assert_includes body, 'data-revelio-type="view"'
  end

  test "turbo frame does not inject middleware script (no </body>)" do
    get "/haml/turbo_frame"
    # Frame responses without layout have no </body>, so no script injection
    refute_includes response.body, '<script id="revelio">'
  end
end
