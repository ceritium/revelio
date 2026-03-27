# frozen_string_literal: true

require "test_helper"

class ConfigTest < Minitest::Test
  def test_default_config
    config = Temple::Devtools::Config.new
    assert_equal false, config.debug_mode
    assert_nil config.project_root
    assert_equal true, config.inject_overlay
  end

  def test_configure_block
    Temple::Devtools.configure do |config|
      config.debug_mode = true
      config.project_root = "/my/app"
    end

    assert_equal true, Temple::Devtools.config.debug_mode
    assert_equal "/my/app", Temple::Devtools.config.project_root
  ensure
    Temple::Devtools.config.debug_mode = false
    Temple::Devtools.config.project_root = nil
  end
end
