# Feature Ideas

Roadmap of features to implement. Each section describes the feature, how it works technically, and what it adds to the devtools panel.

## I18n

### Missing translations
- Subscribe to `i18n.translate` via `ActiveSupport::Notifications` in the middleware
- Collect all translation lookups: key, locale, result, whether it's missing
- Inject as JSON alongside metrics
- Panel section: list of all keys used, missing ones highlighted in red
- Overlay: badge on elements containing `translation missing:` text

### Translation key viewer
- Hover tooltip shows the i18n key used for each translated text
- Click to copy the key (for searching in YAML files)
- Toggle in the panel to show all keys inline (replacing translated text with the key)

## ActiveRecord

### N+1 query detection
- Group queries by normalized SQL (replace literal values with `?`)
- Flag groups where the same query runs N times with different params
- Panel: "N+1 detected: Post Load (10x)" with expandable list
- Overlay: highlight the partial/view that triggered the N+1

### Full SQL in query details
- Show the complete SQL query in the expandable details (currently only shows the name like "Post Load")
- Syntax highlighting or at least monospace formatting

### Slow query highlighting
- Queries above a configurable threshold get highlighted in the details panel
- Threshold configurable: `config.slow_query_threshold = 50 # ms`

## Routing

### Current route info
- Show controller#action, route name, and HTTP method in the metrics panel header
- Collect from `env['action_dispatch.request.path_parameters']` in the middleware

## Assets

### Images without dimensions
- JS scan: find `<img>` tags without `width` and `height` attributes
- These cause layout shifts (CLS)
- Show in a panel section with click-to-scroll

### Blocking scripts
- JS scan: find `<script>` tags without `defer` or `async` (excluding inline scripts)
- These block rendering
- Show count in the panel

## Accessibility

### Basic a11y checks
- `<img>` without `alt` attribute
- `<input>` without associated `<label>` (no `id` matching a label's `for`, no wrapping label)
- Form buttons without accessible text
- Toggle in panel, red overlays on offending elements (same pattern as Stimulus linter)

## ViewComponent

## Performance

### Memory tracking per render
- Already partially implemented (gc_objects)
- Add RSS delta tracking if available
- Warn on partials that allocate excessive objects

### Cache hit/miss tracking
- Subscribe to `cache_read.active_support` and `cache_write.active_support`
- Show cache hit rate in metrics panel
- List cache misses with their keys

## Developer Experience

### Keyboard shortcuts
- `Ctrl+Shift+D` to toggle the panel
- `Ctrl+Shift+O` to toggle outlines
- `Ctrl+Shift+L` to toggle Stimulus linter
- `Escape` to close panel

### Export metrics
- Button to copy all metrics as JSON to clipboard
- Useful for sharing performance data in issues/PRs

### Diff mode
- Compare metrics between two page loads
- Store previous metrics in sessionStorage
- Show delta: "Duration: 150ms (+30ms)", "Queries: 12 (+3)"
