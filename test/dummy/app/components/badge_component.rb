# frozen_string_literal: true

class BadgeComponent < ViewComponent::Base
  def initialize(label:)
    @label = label
  end
end
