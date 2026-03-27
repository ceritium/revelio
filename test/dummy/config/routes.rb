# frozen_string_literal: true

Rails.application.routes.draw do
  # HAML
  get "/haml" => "pages#haml_index"
  get "/haml/partial" => "pages#haml_partial"
  get "/haml/component" => "pages#haml_component"
  get "/haml/mixed" => "pages#haml_mixed"
  get "/haml/stimulus" => "pages#haml_stimulus"
  get "/haml/posts" => "pages#haml_posts"
  get "/haml/turbo" => "pages#haml_turbo"
  get "/haml/turbo_frame" => "pages#haml_turbo_frame"
  get "/haml/turbo_stream" => "pages#haml_turbo_stream"

  # Slim
  get "/slim" => "pages#slim_index"
  get "/slim/partial" => "pages#slim_partial"
  get "/slim/mixed" => "pages#slim_mixed"

  # ERB
  get "/erb" => "pages#erb_index"
  get "/erb/partial" => "pages#erb_partial"
  get "/erb/mixed" => "pages#erb_mixed"
end
