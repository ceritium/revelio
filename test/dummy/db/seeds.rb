# frozen_string_literal: true

10.times do |i|
  Post.create!(title: "Post #{i + 1}", body: "This is the body of post #{i + 1}")
end
