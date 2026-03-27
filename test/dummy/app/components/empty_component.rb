# frozen_string_literal: true

class EmptyComponent < ViewComponent::Base
  def initialize(show: false)
    @show = show
  end
end
