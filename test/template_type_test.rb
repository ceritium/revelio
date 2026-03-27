# frozen_string_literal: true

require "test_helper"

class TemplateTypeTest < Minitest::Test
  include Revelio::TemplateType

  def test_view
    assert_equal "view", template_type("app/views/users/index.html.haml")
  end

  def test_partial
    assert_equal "partial", template_type("app/views/users/_card.html.haml")
  end

  def test_component
    assert_equal "component", template_type("app/components/button_component.html.haml")
  end

  def test_component_relative_path
    assert_equal "component", template_type("components/badge.html.haml")
  end

  def test_layout
    assert_equal "layout", template_type("app/views/layouts/application.html.haml")
  end

  def test_layout_relative_path
    assert_equal "layout", template_type("layouts/application.html.erb")
  end

  def test_slim_view
    assert_equal "view", template_type("app/views/pages/index.html.slim")
  end

  def test_erb_partial
    assert_equal "partial", template_type("app/views/pages/_card.html.erb")
  end
end
