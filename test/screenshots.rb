# frozen_string_literal: true

# Standalone script to capture README screenshots of the dummy app.
# Usage: bundle exec ruby test/screenshots.rb

ENV["RAILS_ENV"] = "test"

require_relative "../test/dummy/config/boot"
require "rails"
require "action_controller/railtie"
require "action_view/railtie"
require "active_record/railtie"
require "view_component"
require "haml/rails_template"
require "slim"

unless defined?(Slim::RailsTemplate)
  Slim::RailsTemplate = Temple::Templates::Rails(
    Slim::Engine, register_as: :slim,
    use_html_safe: true, streaming: true,
    generator: Temple::Generators::RailsOutputBuffer,
    buffer: "@output_buffer"
  )
end

require "revelio"
require "capybara/dsl"
require "capybara/cuprite"

require_relative "../test/dummy/config/application"

DummyApp.config.middleware.use Revelio::Middleware
DummyApp.config.view_component.preview_paths = []
DummyApp.config.view_component.instrumentation_enabled = true
DummyApp.initialize! unless DummyApp.initialized?

# Create schema for Post
begin
  ActiveRecord::Schema.define do
    create_table :posts, force: true do |t|
      t.string :title
      t.text :body
      t.timestamps
    end
  end
  Post.insert_all(3.times.map { |i| { title: "Post #{i + 1}", body: "Body #{i + 1}", created_at: Time.current, updated_at: Time.current } })
rescue
  nil
end

DUMMY_ROOT = File.expand_path("../test/dummy", __dir__)

Revelio.configure do |c|
  c.debug_mode = true
  c.project_root = DUMMY_ROOT
end
Revelio.install!

require_relative "../test/dummy/app/components/badge_component"
require_relative "../test/dummy/app/components/empty_component"
require_relative "../test/dummy/app/controllers/pages_controller"

PagesController.view_paths = [File.join(DUMMY_ROOT, "app/views")]
PagesController.append_view_path File.join(DUMMY_ROOT, "app/components")
PagesController.layout "application"

require_relative "../test/dummy/config/routes"

Capybara.register_driver(:cuprite) do |app|
  Capybara::Cuprite::Driver.new(app, headless: true, window_size: [1280, 800])
end

Capybara.default_driver = :cuprite
Capybara.javascript_driver = :cuprite
Capybara.app = Rails.application

# --- Screenshot helpers ---

SCREENSHOTS_DIR = File.expand_path("../screenshots", __dir__)

module ScreenshotHelpers
  include Capybara::DSL

  def wait_for_devtools
    page.assert_selector "#revelioMenuTrigger", wait: 5
  end

  def open_panel
    return if page.has_css?(".revelio-panel.open", wait: 0.2)

    page.find("#revelioMenuTrigger").click
    page.assert_selector ".revelio-panel.open", wait: 3
  end

  def enable_feature(label)
    open_panel
    page.find("label", text: label).click
    sleep 0.5
  end

  def take_screenshot(name)
    path = File.join(SCREENSHOTS_DIR, "#{name}.png")
    page.save_screenshot(path)
    puts "  ✓ #{path}"
  end
end

include ScreenshotHelpers

# --- Main ---

Dir.mkdir(SCREENSHOTS_DIR) unless Dir.exist?(SCREENSHOTS_DIR)

puts "Capturing screenshots…"

# 1. panel.png — The Revelio panel open on the HAML index page
visit "/haml"
wait_for_devtools
open_panel
sleep 0.3
take_screenshot "panel"

Capybara.reset_sessions!

# 2. outlines.png — View + Partial outlines on /haml/partial
visit "/haml/partial"
wait_for_devtools
enable_feature "Views"
enable_feature "Partials"
sleep 0.5
take_screenshot "outlines"

Capybara.reset_sessions!

# 3. stimulus_linter.png — Stimulus Linter on /haml/stimulus
visit "/haml/stimulus"
wait_for_devtools
enable_feature "Stimulus"
sleep 0.5
take_screenshot "stimulus_linter"

Capybara.reset_sessions!

# 4. turbo_linter.png — Turbo Linter on /haml/turbo_linter
visit "/haml/turbo_linter"
wait_for_devtools
enable_feature "Turbo"
sleep 0.5
take_screenshot "turbo_linter"

Capybara.reset_sessions!

# 5. component_inspector.png — Component Inspector on /haml/component
visit "/haml/component"
wait_for_devtools
enable_feature "Component Inspector"
sleep 0.5
take_screenshot "component_inspector"

Capybara.reset_sessions!

# 6. metrics.png — Request metrics on /haml/posts
visit "/haml/posts"
wait_for_devtools
open_panel
sleep 0.3
take_screenshot "metrics"

Capybara.reset_sessions!

# 7. tooltip.png — Hover tooltip on /haml
visit "/haml"
wait_for_devtools
enable_feature "Hover Tooltips"
page.find("h1").hover
sleep 0.5
page.assert_selector ".revelio-tooltip.visible", wait: 3
take_screenshot "tooltip"

Capybara.reset_sessions!

puts "Done! Screenshots saved to #{SCREENSHOTS_DIR}"
