# frozen_string_literal: true

class PagesController < ActionController::Base
  layout "application"

  def haml_index       = render("pages/haml/index")
  def haml_partial     = render("pages/haml/with_partial")
  def haml_component   = render("pages/haml/with_component")
  def haml_mixed       = render("pages/haml/mixed")

  def slim_index       = render("pages/slim/index")
  def slim_partial     = render("pages/slim/with_partial")
  def slim_mixed       = render("pages/slim/mixed")

  def erb_index        = render("pages/erb/index")
  def erb_partial      = render("pages/erb/with_partial")
  def erb_mixed        = render("pages/erb/mixed")
end
