# frozen_string_literal: true

require_relative "application"

DummyApp.initialize!

# In-memory SQLite: create schema and seed after full initialization
ActiveRecord::Schema.define do
  create_table :posts, force: true do |t|
    t.string :title
    t.text :body
    t.timestamps
  end
end

Post.insert_all(10.times.map { |i| { title: "Post #{i + 1}", body: "Body of post #{i + 1}.", created_at: Time.current, updated_at: Time.current } })
