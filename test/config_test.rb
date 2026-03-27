# frozen_string_literal: true

require "test_helper"

class ConfigTest < Minitest::Test
  def test_default_config
    config = Revelio::Config.new
    assert_equal false, config.debug_mode
    assert_nil config.project_root
    assert_equal true, config.inject_overlay
  end

  def test_configure_block
    Revelio.configure do |config|
      config.debug_mode = true
      config.project_root = "/my/app"
    end

    assert_equal true, Revelio.config.debug_mode
    assert_equal "/my/app", Revelio.config.project_root
  ensure
    Revelio.config.debug_mode = false
    Revelio.config.project_root = nil
  end
end
