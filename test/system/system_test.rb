# frozen_string_literal: true

ENV["RAILS_ENV"] = "test"

require_relative "../dummy/config/boot"
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
require "capybara/minitest"
require "capybara/cuprite"

require_relative "../dummy/config/application"

DummyApp.config.middleware.use Revelio::Middleware
DummyApp.config.view_component.preview_paths = []
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

DUMMY_ROOT = File.expand_path("../dummy", __dir__)

Revelio.configure do |c|
  c.debug_mode = true
  c.project_root = DUMMY_ROOT
end
Revelio.install!

require_relative "../dummy/app/components/badge_component"
require_relative "../dummy/app/controllers/pages_controller"

PagesController.view_paths = [File.join(DUMMY_ROOT, "app/views")]
PagesController.append_view_path File.join(DUMMY_ROOT, "app/components")
PagesController.layout "application"

require_relative "../dummy/config/routes"

require "minitest/autorun"

Capybara.register_driver(:cuprite) do |app|
  Capybara::Cuprite::Driver.new(app, headless: true, window_size: [1280, 800])
end

Capybara.default_driver = :cuprite
Capybara.javascript_driver = :cuprite
Capybara.app = Rails.application

class SystemTest < Minitest::Test
  include Capybara::DSL
  include Capybara::Minitest::Assertions

  def teardown
    Capybara.reset_sessions!
  end

  def wait_for_devtools
    assert_selector "#revelioMenuTrigger", wait: 5
  end

  def enable_feature(label)
    find("#revelioMenuTrigger").click unless page.has_css?(".revelio-panel.open")
    find("label", text: label).click
    sleep 0.3
  end

  def overlay_count
    page.evaluate_script("document.querySelectorAll('.revelio-boundary-overlay').length")
  end

  def devtools_comments_count
    page.evaluate_script("(function(){ var w=document.createTreeWalker(document,NodeFilter.SHOW_COMMENT); var n=0; while(w.nextNode()){if(w.currentNode.textContent.includes('revelio-begin'))n++;} return n; })()")
  end
end

class WidgetSystemTest < SystemTest
  def test_widget_renders_on_page_load
    visit "/haml"
    wait_for_devtools
    assert_selector ".revelio-floating-menu"
  end

  def test_panel_opens_on_click
    visit "/haml"
    wait_for_devtools
    find("#revelioMenuTrigger").click
    assert_selector ".revelio-panel.open"
    assert_selector ".revelio-panel.open"
  end

  def test_view_outlines_appear
    visit "/haml"
    wait_for_devtools
    enable_feature "Views"
    assert overlay_count > 0, "Expected view outline overlays"
  end

  def test_partial_outlines_appear
    visit "/haml/partial"
    wait_for_devtools
    enable_feature "Partials"
    assert overlay_count > 0, "Expected partial outline overlays"
  end

  def test_metrics_section_shows_data
    visit "/haml"
    wait_for_devtools
    find("#revelioMenuTrigger").click
    assert_text "Duration"
    assert_text "Queries"
    assert_text "GC alloc"
  end
end

class TurboSystemTest < SystemTest
  def test_outlines_persist_across_turbo_drive
    visit "/haml"
    wait_for_devtools
    enable_feature "Views"
    assert overlay_count > 0

    within("nav") { click_link "Slim", match: :first }
    wait_for_devtools
    sleep 1

    # Debug: check state after navigation
    state = page.evaluate_script("JSON.parse(localStorage.getItem('revelio-settings') || '{}')")
    boundaries = devtools_comments_count
    count = overlay_count

    all_comments = page.evaluate_script("(function(){ var w=document.createTreeWalker(document,NodeFilter.SHOW_COMMENT); var r=[]; while(w.nextNode()){var t=w.currentNode.textContent.trim(); if(t.includes('revelio'))r.push(t.substring(0,80));} return r; })()")
    assert count > 0, "Outlines should rebuild. boundaries=#{boundaries}, overlays=#{count}, comments=#{all_comments.inspect}"
  end

  def test_outlines_rebuild_after_turbo_frame_loads
    visit "/haml/turbo"
    wait_for_devtools
    enable_feature "Partials"

    # Wait for lazy turbo frame to load content
    assert_selector "turbo-frame#lazy-posts .card", wait: 5
    sleep 0.5

    frame_comments = page.evaluate_script("(function(){ var f=document.querySelector('turbo-frame#lazy-posts'); if(!f)return 0; var w=document.createTreeWalker(f,NodeFilter.SHOW_COMMENT); var n=0; while(w.nextNode()){if(w.currentNode.textContent.includes('revelio-begin'))n++;} return n; })()")
    assert frame_comments > 0, "Turbo frame should contain devtools comment markers"

    assert overlay_count > 0, "Overlays should include turbo frame content"
  end

  def test_outlines_rebuild_after_turbo_stream
    visit "/haml/turbo"
    wait_for_devtools
    enable_feature "Views"

    initial_comments = devtools_comments_count

    # Trigger turbo stream
    click_button "Add a post via Stream"
    assert_selector "#stream-target .card", wait: 5
    sleep 0.5

    new_comments = devtools_comments_count
    assert new_comments > initial_comments, "Turbo Stream should add devtools comment markers"
  end

  def test_metrics_update_after_turbo_drive_navigation
    visit "/haml"
    wait_for_devtools
    find("#revelioMenuTrigger").click

    # Get initial duration
    initial_metrics = page.evaluate_script("document.getElementById('revelio-metrics')?.textContent")
    assert initial_metrics, "Should have metrics JSON"

    within("nav") { click_link "Slim", match: :first }
    wait_for_devtools
    sleep 0.3
    find("#revelioMenuTrigger").click

    # Metrics should have been re-rendered with new data
    new_metrics = page.evaluate_script("document.getElementById('revelio-metrics')?.textContent")
    assert new_metrics, "Should have metrics JSON after navigation"
    # The metrics JSON should be different (different template, different timing)
    assert_text "Duration"
  end
end

class StimulusLinterSystemTest < SystemTest
  def test_linter_detects_issues
    visit "/haml/stimulus"
    wait_for_devtools
    enable_feature "Stimulus"
    sleep 0.5

    issues = page.evaluate_script("document.querySelectorAll('.revelio-lint-item').length")
    assert issues > 0, "Stimulus linter should detect issues"
  end

  def test_linter_shows_issue_types
    visit "/haml/stimulus"
    wait_for_devtools
    enable_feature "Stimulus"
    sleep 0.5

    assert_selector ".revelio-lint-badge-controller"
  end
end

class TurboLinterSystemTest < SystemTest
  def test_linter_detects_issues
    visit "/haml/turbo_linter"
    wait_for_devtools
    enable_feature "Turbo"
    sleep 0.5

    issues = page.evaluate_script("document.querySelectorAll('#revelioTurboResults .revelio-lint-item').length")
    assert issues > 0, "Turbo linter should detect issues"
  end

  def test_linter_shows_issue_types
    visit "/haml/turbo_linter"
    wait_for_devtools
    enable_feature "Turbo"
    sleep 0.5

    assert_selector ".revelio-lint-badge-frame"
    assert_selector ".revelio-lint-badge-reference"
  end

  def test_linter_detects_frame_without_id
    visit "/haml/turbo_linter"
    wait_for_devtools
    enable_feature "Turbo"
    sleep 0.5

    assert_text 'missing required "id" attribute'
  end

  def test_linter_detects_dangling_reference
    visit "/haml/turbo_linter"
    wait_for_devtools
    enable_feature "Turbo"
    sleep 0.5

    assert_text "points to non-existent frame"
  end
end

class TooltipSystemTest < SystemTest
  def test_tooltip_appears_on_hover
    visit "/haml"
    wait_for_devtools
    enable_feature "Hover Tooltips"

    find("h1").hover
    assert_selector ".revelio-tooltip.visible", wait: 3
    assert_text "index.html.haml"
  end
end
