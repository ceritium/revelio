# frozen_string_literal: true

require "test_helper"

class MiddlewareTest < Minitest::Test
  def setup
    @html_body = "<html><body><div>hello</div></body></html>"
  end

  def test_injects_script_before_closing_body
    app = ->(env) { [200, { "content-type" => "text/html" }, [@html_body]] }
    middleware = Revelio::Middleware.new(app)

    _status, _headers, body = middleware.call({})
    response = body.first

    assert_includes response, '<script id="revelio">'
    assert_includes response, "revelio-floating-menu"
    assert_includes response, "</body>"
  end

  def test_does_not_inject_for_non_html
    app = ->(env) { [200, { "content-type" => "application/json" }, ['{"ok":true}']] }
    middleware = Revelio::Middleware.new(app)

    _status, _headers, body = middleware.call({})
    refute_includes body.first, "revelio"
  end

  def test_does_not_inject_for_non_200
    app = ->(env) { [302, { "content-type" => "text/html" }, [@html_body]] }
    middleware = Revelio::Middleware.new(app)

    _status, _headers, body = middleware.call({})
    refute_includes body.first, "revelio"
  end
end
