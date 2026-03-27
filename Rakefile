# frozen_string_literal: true

require "rake/testtask"

Rake::TestTask.new(:test) do |t|
  t.libs << "test"
  t.libs << "lib"
  t.test_files = FileList["test/*_test.rb"]
end

Rake::TestTask.new(:test_system) do |t|
  t.libs << "test"
  t.libs << "lib"
  t.test_files = FileList["test/system/*_test.rb"]
end

namespace :build do
  desc "Compile overlay source files (JS + CSS + HTML) into lib/revelio/overlay.js"
  task :overlay do
    src = File.expand_path("lib/revelio/overlay", __dir__)
    out = File.expand_path("lib/revelio/overlay.js", __dir__)

    js  = File.read(File.join(src, "overlay.js"))
    css = File.read(File.join(src, "overlay.css"))
    html = File.read(File.join(src, "overlay.html"))

    # Minify CSS: collapse whitespace into single-line string safe for JS
    css_inline = css.gsub(/\s*\n\s*/, " ").gsub("'", "\\\\'").strip
    # Minify HTML: collapse into single line
    html_inline = html.gsub(/\s*\n\s*/, "").gsub("'", "\\\\'").strip

    compiled = js
      .sub("'__REVELIO_CSS__'", "'" + css_inline + "'")
      .sub("'__REVELIO_HTML__'", "'" + html_inline + "'")

    File.write(out, compiled)
    puts "Built #{out} (#{File.size(out)} bytes)"
  end

  desc "Watch overlay source files and rebuild on changes"
  task :watch do
    src = File.expand_path("lib/revelio/overlay", __dir__)
    files = Dir[File.join(src, "*")]
    mtimes = files.each_with_object({}) { |f, h| h[f] = File.mtime(f) }

    puts "Watching #{src} for changes..."
    loop do
      changed = false
      Dir[File.join(src, "*")].each do |f|
        mt = File.mtime(f)
        if mtimes[f] != mt
          mtimes[f] = mt
          changed = true
        end
      end
      if changed
        system("bundle exec rake build:overlay")
      end
      sleep 1
    end
  end
end

task default: :test
