# frozen_string_literal: true

require_relative "lib/revelio/version"

Gem::Specification.new do |spec|
  spec.name = "revelio"
  spec.version = Revelio::VERSION
  spec.authors = ["Jose Galisteo"]
  spec.email = ["jose@josegalisteo.com"]

  spec.summary = "Reveal what's behind your Rails views"
  spec.description = "Debug overlays, template boundaries, and source location tracking " \
                     "for HAML, Slim, and ERB templates. Inspired by ReActionView."
  spec.homepage = "https://github.com/ceritium/revelio"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.2.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage

  spec.files = Dir["lib/**/*", "LICENSE.txt"]
  spec.require_paths = ["lib"]

  spec.add_dependency "rack"
end
