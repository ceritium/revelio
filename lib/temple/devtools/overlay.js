(function() {
  if (window.__templeDevtoolsLoaded) return;
  window.__templeDevtoolsLoaded = true;

  var SETTINGS_KEY = 'temple-devtools-settings';
  var EDITOR_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: 'vscode', label: 'VS Code' },
    { value: 'cursor', label: 'Cursor' },
    { value: 'rubymine', label: 'RubyMine' },
    { value: 'zed', label: 'Zed' },
    { value: 'windsurf', label: 'Windsurf' },
    { value: 'sublime', label: 'Sublime Text' },
    { value: 'idea', label: 'IntelliJ IDEA' },
    { value: 'atom', label: 'Atom' },
    { value: 'emacs', label: 'Emacs' },
    { value: 'nvim', label: 'Neovim' },
    { value: 'vim', label: 'Vim' },
    { value: 'macvim', label: 'MacVim' },
    { value: 'textmate', label: 'TextMate' },
    { value: 'nova', label: 'Nova' },
    { value: 'vscodium', label: 'VSCodium' }
  ];

  var TYPE_COLORS = {
    view:      { outline: '#3b82f6', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    partial:   { outline: '#10b981', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    component: { outline: '#f59e0b', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' }
  };

  var LINT_COLORS = { outline: '#ef4444', bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' };

  // State — everything off by default
  var state = {
    showViewOutlines: false,
    showPartialOutlines: false,
    showComponentOutlines: false,
    showTooltips: false,
    showStimulusLinter: false,
    menuOpen: false,
    preferredEditor: 'auto'
  };

  var projectPath = '';
  var activeTooltip = null;
  var activeTooltipElement = null;

  function loadProjectPath() {
    var meta = document.querySelector('meta[name="temple-project-path"]');
    if (meta && meta.content) projectPath = meta.content;
  }

  function loadSettings() {
    try {
      var saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        var s = JSON.parse(saved);
        state.showViewOutlines = s.showViewOutlines || false;
        state.showPartialOutlines = s.showPartialOutlines || false;
        state.showComponentOutlines = s.showComponentOutlines || false;
        state.showTooltips = s.showTooltips || false;
        state.showStimulusLinter = s.showStimulusLinter || false;
        state.menuOpen = s.menuOpen || false;
        state.preferredEditor = s.preferredEditor || 'auto';
      }
    } catch(e) {}
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
    updateMenuButtonState();
  }

  function hasActiveOutlines() {
    return state.showViewOutlines || state.showPartialOutlines || state.showComponentOutlines;
  }

  function hasActiveFeatures() {
    return hasActiveOutlines() || state.showTooltips || state.showStimulusLinter;
  }

  function updateMenuButtonState() {
    var trigger = document.getElementById('templeMenuTrigger');
    if (trigger) {
      if (hasActiveFeatures()) {
        trigger.classList.add('has-active-options');
      } else {
        trigger.classList.remove('has-active-options');
      }
    }
  }

  function shortName(filePath) {
    if (!filePath) return '';
    var parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  // --- Editor ---

  function getEditorUrl(editor, filePath, line) {
    var abs = filePath.startsWith('/') ? filePath : (projectPath ? projectPath + '/' + filePath : filePath);
    switch(editor) {
      case 'cursor':    return 'cursor://file/' + abs + ':' + line;
      case 'vscode':    return 'vscode://file/' + abs + ':' + line;
      case 'vscodium':  return 'vscodium://file/' + abs + ':' + line;
      case 'zed':       return 'zed://file/' + abs + ':' + line;
      case 'windsurf':  return 'windsurf://file/' + abs + ':' + line;
      case 'sublime':   return 'subl://open?url=file://' + abs + '&line=' + line;
      case 'atom':      return 'atom://core/open/file?filename=' + abs + '&line=' + line;
      case 'textmate':  return 'txmt://open?url=file://' + abs + '&line=' + line;
      case 'emacs':     return 'emacs://open?url=file://' + abs + '&line=' + line;
      case 'idea':      return 'idea://open?file=' + abs + '&line=' + line;
      case 'rubymine':  return 'x-mine://open?file=' + abs + '&line=' + line;
      case 'nova':      return 'nova://open?path=' + abs + '&line=' + line;
      case 'macvim':    return 'mvim://open?url=file://' + abs + '&line=' + line;
      case 'vim':       return 'vim://open?url=file://' + abs + '&line=' + line;
      case 'nvim':      return 'nvim://open?url=file://' + abs + '&line=' + line;
      default:          return 'vscode://file/' + abs + ':' + line;
    }
  }

  function openInEditor(filePath, line) {
    var editor = state.preferredEditor === 'auto' ? 'vscode' : state.preferredEditor;
    var url = getEditorUrl(editor, filePath, line);
    if (url) {
      try { window.open(url, '_self'); } catch(e) {}
    }
  }

  // --- Tooltip ---

  function removeActiveTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    if (activeTooltipElement) {
      activeTooltipElement.classList.remove('temple-devtools-hovered');
      activeTooltipElement = null;
    }
  }

  function createTooltip(element) {
    if (activeTooltipElement === element) return;
    removeActiveTooltip();

    var file = element.getAttribute('data-devtools-file') || '';
    var line = element.getAttribute('data-devtools-line') || '';
    if (!file) return;

    activeTooltipElement = element;
    element.classList.add('temple-devtools-hovered');

    var tooltip = document.createElement('div');
    tooltip.className = 'temple-devtools-tooltip';

    var location = document.createElement('div');
    location.className = 'temple-devtools-location';
    location.setAttribute('data-tooltip', 'Open in editor');

    var pathSpan = document.createElement('span');
    pathSpan.className = 'temple-devtools-filepath';
    pathSpan.textContent = file + ':' + line;
    location.appendChild(pathSpan);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'temple-devtools-copy-btn';
    copyBtn.textContent = '\uD83D\uDCCB';
    copyBtn.setAttribute('data-tooltip', 'Copy path');
    copyBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      navigator.clipboard.writeText(file + ':' + line).then(function() {
        copyBtn.textContent = '\u2705';
        setTimeout(function() { copyBtn.textContent = '\uD83D\uDCCB'; }, 1000);
      });
    });
    location.appendChild(copyBtn);

    location.addEventListener('click', function(e) {
      if (e.target.closest('.temple-devtools-copy-btn')) return;
      e.preventDefault();
      e.stopPropagation();
      openInEditor(file, line);
    });

    tooltip.appendChild(location);

    var tagInfo = document.createElement('div');
    tagInfo.className = 'temple-devtools-tag-info';
    var tag = element.tagName.toLowerCase();
    var id = element.id ? '#' + element.id : '';
    var cls = element.className
      ? '.' + element.className.split(/\s+/).filter(function(c) { return c.indexOf('temple-devtools') === -1; }).join('.')
      : '';
    if (cls === '.') cls = '';
    if (file.match(/\.haml$/i)) {
      tagInfo.textContent = '%' + tag + id + cls;
    } else if (file.match(/\.slim$/i)) {
      tagInfo.textContent = tag + id + cls;
    } else {
      var rawCls = element.className
        ? element.className.split(/\s+/).filter(function(c) { return c.indexOf('temple-devtools') === -1; }).join(' ')
        : '';
      tagInfo.textContent = '<' + tag + (element.id ? ' id="' + element.id + '"' : '') + (rawCls ? ' class="' + rawCls + '"' : '') + '>';
    }
    tooltip.appendChild(tagInfo);

    var hideTimeout = null;
    function show() { clearTimeout(hideTimeout); tooltip.classList.add('visible'); }
    function hide() { hideTimeout = setTimeout(function() { removeActiveTooltip(); }, 150); }

    element.addEventListener('mouseleave', hide);
    tooltip.addEventListener('mouseenter', show);
    tooltip.addEventListener('mouseleave', hide);

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    requestAnimationFrame(function() {
      var rect = element.getBoundingClientRect();
      var tw = tooltip.offsetWidth;
      var th = tooltip.offsetHeight;
      var vw = window.innerWidth;

      var left = rect.left + (rect.width / 2) - (tw / 2);
      var top = rect.top - th - 8;

      if (left < 8) left = 8;
      if (left + tw > vw - 8) left = vw - tw - 8;
      if (top < 8) top = rect.bottom + 8;

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.classList.add('visible');
    });
  }

  // --- Comment-based template boundaries ---

  function findTemplateBoundaries() {
    if (cachedBoundaries) return cachedBoundaries;
    var boundaries = [];
    var walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
    var openStack = [];

    while (walker.nextNode()) {
      var text = walker.currentNode.textContent.trim();
      if (text.indexOf('temple-devtools-begin') === 0) {
        openStack.push(walker.currentNode);
      } else if (text.indexOf('temple-devtools-end') === 0 && openStack.length) {
        var begin = openStack.pop();
        var beginText = begin.textContent.trim();
        var fileMatch = beginText.match(/file="([^"]+)"/);
        var typeMatch = beginText.match(/type="([^"]+)"/);
        var shortMatch = beginText.match(/short="([^"]+)"/);
        if (fileMatch && typeMatch) {
          boundaries.push({
            beginNode: begin,
            endNode: walker.currentNode,
            file: fileMatch[1],
            type: typeMatch[1],
            short: shortMatch ? shortMatch[1] : fileMatch[1]
          });
        }
      }
    }
    cachedBoundaries = boundaries;
    return boundaries;
  }

  var activeOverlays = [];

  function clearOverlays() {
    activeOverlays.forEach(function(o) { o.remove(); });
    activeOverlays = [];
  }

  var cachedMetrics = null;
  var cachedBoundaries = null;

  function invalidateCache() {
    cachedMetrics = null;
    cachedBoundaries = null;
  }

  function getMetrics() {
    if (cachedMetrics) return cachedMetrics;
    var el = document.getElementById('temple-devtools-metrics');
    if (!el) return null;
    try { cachedMetrics = JSON.parse(el.textContent); return cachedMetrics; } catch(e) { return null; }
  }

  function getRenderInfo(file) {
    var m = getMetrics();
    if (!m || !m.details || !m.details.renders) return null;
    var info = { duration: 0, queries: 0, query_time: 0, gc_objects: 0, count: 0 };
    m.details.renders.forEach(function(r) {
      if (r.template === file) {
        info.duration += r.duration;
        info.queries += (r.queries || 0);
        info.query_time += (r.query_time || 0);
        info.gc_objects += (r.gc_objects || 0);
        info.count++;
      }
    });
    return info.count > 0 ? info : null;
  }

  function createBoundaryOverlay(boundary) {
    var colors = TYPE_COLORS[boundary.type];
    if (!colors) return;

    // Collect all element nodes between begin and end comments
    var node = boundary.beginNode.nextSibling;
    var rects = [];
    while (node && node !== boundary.endNode) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        var r = node.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rects.push(r);
      }
      node = node.nextSibling;
    }

    if (rects.length === 0) return;

    // Compute bounding box — use absolute (document) coords so it scrolls naturally
    var scrollX = window.scrollX;
    var scrollY = window.scrollY;
    var top = Infinity, left = Infinity, bottom = 0, right = 0;
    rects.forEach(function(r) {
      if (r.top + scrollY < top) top = r.top + scrollY;
      if (r.left + scrollX < left) left = r.left + scrollX;
      if (r.bottom + scrollY > bottom) bottom = r.bottom + scrollY;
      if (r.right + scrollX > right) right = r.right + scrollX;
    });

    var overlay = document.createElement('div');
    overlay.className = 'temple-devtools-boundary-overlay';
    overlay.style.cssText = [
      'position:absolute',
      'top:' + top + 'px',
      'left:' + left + 'px',
      'width:' + (right - left) + 'px',
      'height:' + (bottom - top) + 'px',
      'outline:2px dotted ' + colors.outline,
      'outline-offset:2px',
      'pointer-events:none',
      'z-index:999'
    ].join(';');

    // Label
    var label = document.createElement('div');
    label.className = 'temple-devtools-overlay-label';
    label.style.background = colors.bg;
    label.style.color = colors.color;
    label.style.borderColor = colors.border;
    label.style.position = 'absolute';
    label.style.top = '-18px';
    label.style.left = '4px';
    label.style.pointerEvents = 'auto';

    var info = getRenderInfo(boundary.file);
    var shortText = boundary.short;
    var fullText = boundary.file;
    if (info) {
      var durStr = info.duration < 0.1 ? '<0.1ms' : info.duration.toFixed(1) + 'ms';
      shortText += ' (' + durStr + (info.queries > 0 ? ' ' + info.queries + 'q' : '') + (info.count > 1 ? ' ' + info.count + 'x' : '') + ')';
      var fullParts = [durStr];
      if (info.queries > 0) fullParts.push(info.queries + 'q ' + info.query_time.toFixed(1) + 'ms');
      fullParts.push(info.gc_objects.toLocaleString() + ' alloc');
      if (info.count > 1) fullParts.push(info.count + 'x');
      fullText += ' (' + fullParts.join(' | ') + ')';
    }
    label.textContent = shortText;

    label.addEventListener('mouseenter', function() {
      label.textContent = fullText;
      label.style.zIndex = '1002';
    });
    label.addEventListener('mouseleave', function() {
      label.textContent = shortText;
      label.style.zIndex = '1000';
    });
    label.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      openInEditor(boundary.file, 1);
    });

    // If near the top of the document, put label inside
    if (top < 20) {
      label.style.top = '2px';
      label.style.left = '2px';
    }

    overlay.appendChild(label);
    document.body.appendChild(overlay);
    activeOverlays.push(overlay);
  }

  function applyAllOutlines() {
    clearOverlays();
    invalidateCache();
    var boundaries = findTemplateBoundaries();
    boundaries.forEach(function(b) {
      if (b.type === 'view' && state.showViewOutlines) createBoundaryOverlay(b);
      if (b.type === 'partial' && state.showPartialOutlines) createBoundaryOverlay(b);
      if (b.type === 'component' && state.showComponentOutlines) createBoundaryOverlay(b);
    });
  }

  // --- Server Metrics ---

  function renderMetrics() {
    var section = document.getElementById('templeMetricsSection');
    if (!section) return;

    var el = document.getElementById('temple-devtools-metrics');
    if (!el) { section.innerHTML = ''; return; }

    try {
      var m = JSON.parse(el.textContent);
    } catch(e) { return; }

    var html = '<div class="temple-devtools-metrics-header">Request</div>';
    html += '<div class="temple-devtools-metrics-grid">';
    var t = m.thresholds || {};
    html += metric('Duration', m.duration + 'ms', m.duration > (t.duration || 200) ? 'warn' : 'ok');
    html += metric('Queries', m.queries + ' (' + m.query_time + 'ms)', m.queries > (t.queries || 20) ? 'warn' : 'ok');
    html += metric('Renders', m.renders + ' (' + m.render_time + 'ms)', '');
    html += metric('GC alloc', m.gc_objects.toLocaleString() + ' obj', m.gc_objects > (t.gc_objects || 100000) ? 'warn' : '');
    html += '</div>';

    // Query details (collapsible)
    if (m.details && m.details.queries && m.details.queries.length > 0) {
      html += '<details class="temple-devtools-metrics-details">';
      html += '<summary>' + m.details.queries.length + ' queries</summary>';
      html += '<div class="temple-devtools-metrics-list">';
      m.details.queries.forEach(function(q) {
        html += '<div class="temple-devtools-metrics-item">';
        html += '<span class="temple-devtools-metrics-dur">' + q.duration + 'ms</span> ';
        html += '<span class="temple-devtools-metrics-name">' + escapeHtml(q.name || 'SQL') + '</span>';
        html += '</div>';
      });
      html += '</div></details>';
    }

    // Render details
    if (m.details && m.details.renders && m.details.renders.length > 0) {
      html += '<details class="temple-devtools-metrics-details">';
      html += '<summary>' + m.details.renders.length + ' renders</summary>';
      html += '<div class="temple-devtools-metrics-list">';
      m.details.renders.forEach(function(r) {
        var extra = [];
        if (r.queries > 0) extra.push(r.queries + 'q ' + r.query_time + 'ms');
        if (r.gc_objects > 0) extra.push(r.gc_objects.toLocaleString() + ' alloc');
        var suffix = extra.length > 0 ? ' <span class="temple-devtools-metrics-extra">' + extra.join(' | ') + '</span>' : '';
        html += '<div class="temple-devtools-metrics-item">';
        html += '<span class="temple-devtools-metrics-dur">' + r.duration + 'ms</span> ';
        html += '<span class="temple-devtools-metrics-name">' + escapeHtml(r.template) + suffix + '</span>';
        html += '</div>';
      });
      html += '</div></details>';
    }

    section.innerHTML = html;
  }

  function metric(label, value, cls) {
    return '<div class="temple-devtools-metric' + (cls ? ' temple-devtools-metric-' + cls : '') + '">' +
      '<span class="temple-devtools-metric-value">' + value + '</span>' +
      '<span class="temple-devtools-metric-label">' + label + '</span>' +
      '</div>';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Stimulus Linter ---

  var stimulusLintOverlays = [];

  function getStimulusApp() {
    return window.Stimulus || null;
  }

  function getRegisteredControllers() {
    var app = getStimulusApp();
    if (!app || !app.router || !app.router.modules) return {};
    var map = {};
    app.router.modules.forEach(function(mod) {
      var id = mod.definition.identifier;
      map[id] = mod.definition.controllerConstructor;
    });
    return map;
  }

  function scanStimulusIssues() {
    var app = getStimulusApp();
    if (!app) return [];

    var controllers = getRegisteredControllers();
    var ids = Object.keys(controllers);
    var issues = [];

    // Check 1: unregistered controllers
    document.querySelectorAll('[data-controller]').forEach(function(el) {
      if (el.closest('.temple-devtools-floating-menu')) return;
      el.getAttribute('data-controller').trim().split(/\s+/).forEach(function(name) {
        if (name && !controllers[name]) {
          issues.push({ type: 'controller', element: el, identifier: name,
            message: 'controller "' + name + '" is not registered' });
        }
      });
    });

    // Check 2: unknown targets
    ids.forEach(function(id) {
      var klass = controllers[id];
      var validTargets = klass.targets || [];
      var selector = '[data-' + id + '-target]';
      document.querySelectorAll(selector).forEach(function(el) {
        if (el.closest('.temple-devtools-floating-menu')) return;
        var targetName = el.getAttribute('data-' + id + '-target');
        if (targetName && validTargets.indexOf(targetName) === -1) {
          issues.push({ type: 'target', element: el, identifier: id,
            message: 'target "' + targetName + '" not in ' + id + '.targets' });
        }
      });
    });

    // Check 3: unknown actions
    var actionRegex = /(?:(\w[\w-]*)->)?(\w[\w-]*)#(\w+)/g;
    document.querySelectorAll('[data-action]').forEach(function(el) {
      if (el.closest('.temple-devtools-floating-menu')) return;
      var value = el.getAttribute('data-action');
      var match;
      actionRegex.lastIndex = 0;
      while ((match = actionRegex.exec(value)) !== null) {
        var id = match[2];
        var method = match[3];
        if (!controllers[id]) continue; // caught by Check 1
        var proto = controllers[id].prototype;
        if (typeof proto[method] !== 'function') {
          issues.push({ type: 'action', element: el, identifier: id,
            message: 'method "' + method + '" not found on ' + id });
        }
      }
    });

    return issues;
  }

  function clearStimulusLintOverlays() {
    stimulusLintOverlays.forEach(function(o) { o.remove(); });
    stimulusLintOverlays = [];
  }

  function applyStimulusLintOverlays(issues) {
    clearStimulusLintOverlays();
    issues.forEach(function(issue) {
      var rect = issue.element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      var scrollX = window.scrollX;
      var scrollY = window.scrollY;

      var overlay = document.createElement('div');
      overlay.className = 'temple-devtools-lint-overlay';
      overlay.style.cssText = [
        'position:absolute',
        'top:' + (rect.top + scrollY) + 'px',
        'left:' + (rect.left + scrollX) + 'px',
        'width:' + rect.width + 'px',
        'height:' + rect.height + 'px',
        'outline:2px solid ' + LINT_COLORS.outline,
        'outline-offset:1px',
        'pointer-events:none',
        'z-index:998'
      ].join(';');

      var label = document.createElement('div');
      label.className = 'temple-devtools-lint-label';
      label.textContent = issue.message;
      overlay.appendChild(label);

      document.body.appendChild(overlay);
      stimulusLintOverlays.push(overlay);
    });
  }

  function renderStimulusResults(issues) {
    var container = document.getElementById('templeStimulusResults');
    if (!container) return;

    if (!getStimulusApp()) {
      container.innerHTML = '<div class="temple-devtools-lint-info">Stimulus not found on window.Stimulus</div>';
      return;
    }

    if (issues.length === 0) {
      container.innerHTML = '<div class="temple-devtools-lint-ok">No issues found</div>';
      return;
    }

    var html = '<div class="temple-devtools-lint-count">' + issues.length + ' issue' + (issues.length > 1 ? 's' : '') + '</div>';
    html += '<div class="temple-devtools-lint-list">';
    issues.forEach(function(issue, i) {
      html += '<div class="temple-devtools-lint-item" data-lint-index="' + i + '">';
      html += '<span class="temple-devtools-lint-badge temple-devtools-lint-badge-' + issue.type + '">' + issue.type + '</span> ';
      html += '<span class="temple-devtools-lint-msg">' + issue.message + '</span>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    // Click to scroll to element
    container.querySelectorAll('.temple-devtools-lint-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var idx = parseInt(item.getAttribute('data-lint-index'));
        var el = issues[idx] && issues[idx].element;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.outline = '3px solid #ef4444';
          setTimeout(function() { el.style.outline = ''; }, 1500);
        }
      });
    });
  }

  function runStimulusLinter() {
    if (!state.showStimulusLinter) {
      clearStimulusLintOverlays();
      var container = document.getElementById('templeStimulusResults');
      if (container) container.innerHTML = '';
      return;
    }
    var issues = scanStimulusIssues();
    applyStimulusLintOverlays(issues);
    renderStimulusResults(issues);
  }


  // --- Hover handler ---

  function findBoundaryForElement(el) {
    var boundaries = findTemplateBoundaries();
    for (var i = 0; i < boundaries.length; i++) {
      var b = boundaries[i];
      var node = b.beginNode.nextSibling;
      while (node && node !== b.endNode) {
        if (node.nodeType === Node.ELEMENT_NODE && (node === el || node.contains(el))) {
          return b;
        }
        node = node.nextSibling;
      }
    }
    return null;
  }

  document.addEventListener('mouseover', function(e) {
    if (!state.showTooltips) return;
    var el = e.target.closest('[data-devtools-file]');
    if (el) { createTooltip(el); return; }

    // Fallback for ERB: find containing comment boundary
    var target = e.target;
    if (target.nodeType !== Node.ELEMENT_NODE) return;
    if (target.closest('.temple-devtools-floating-menu')) return;
    if (target.closest('.temple-devtools-tooltip')) return;
    var boundary = findBoundaryForElement(target);
    if (boundary) {
      target.setAttribute('data-devtools-file', boundary.file);
      target.setAttribute('data-devtools-line', '1');
      createTooltip(target);
    }
  });

  // --- Floating Menu ---

  function injectStyles() {
    if (document.getElementById('temple-devtools-styles')) return;
    var style = document.createElement('style');
    style.id = 'temple-devtools-styles';
    style.textContent = '\
.temple-devtools-floating-menu {\
  position: fixed;\
  top: 0;\
  right: 0;\
  z-index: 2147483643;\
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\
}\
.temple-devtools-menu-trigger {\
  padding: 4px 7px;\
  border-radius: 0 0 0 10px;\
  background: white;\
  border: 1px solid #c0c0c0;\
  border-top: none;\
  border-right: none;\
  box-shadow: 0px 1px 3px rgba(0,0,0,0.1);\
  cursor: pointer;\
  transition: all 0.2s ease;\
  display: flex;\
  align-items: center;\
  gap: 4px;\
  z-index: 2147483640;\
  font-size: 12px;\
}\
.temple-devtools-menu-trigger:hover {\
  background: #f9fafb;\
  border-color: #9ca3af;\
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);\
}\
.temple-devtools-menu-trigger:active { transform: scale(0.98); }\
.temple-devtools-menu-trigger.has-active-options {\
  background: #dbeafe;\
  border-color: #3b82f6;\
}\
.temple-devtools-menu-trigger.has-active-options:hover {\
  background: #bfdbfe;\
  border-color: #2563eb;\
}\
.temple-devtools-menu-trigger.has-active-options .temple-devtools-trigger-text {\
  color: #1d4ed8;\
}\
.temple-devtools-trigger-icon { font-size: 14px; line-height: 1; }\
.temple-devtools-trigger-text { font-size: 11px; font-weight: 600; color: #555; letter-spacing: 0.2px; }\
.temple-devtools-panel {\
  position: absolute;\
  top: 28px;\
  right: 10px;\
  background: white;\
  border-radius: 8px;\
  border: 1px solid #c0c0c0;\
  box-shadow: 0px 2px 8px rgba(0,0,0,0.1);\
  padding: 0;\
  min-width: 280px;\
  opacity: 0;\
  visibility: hidden;\
  transform: translateY(-10px) scale(0.95);\
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);\
  transform-origin: top right;\
}\
.temple-devtools-panel.open {\
  opacity: 1;\
  visibility: visible;\
  transform: translateY(0) scale(1);\
}\
.temple-devtools-panel-header {\
  padding: 16px 20px;\
  border-bottom: 1px solid #e5e7eb;\
  font-weight: 600;\
  font-size: 14px;\
  color: #374151;\
  background: #f9fafb;\
  border-radius: 8px 8px 0 0;\
}\
.temple-devtools-toggle-item {\
  padding: 12px 20px;\
  border-bottom: 1px solid #f3f4f6;\
}\
.temple-devtools-toggle-item:last-child { border-bottom: none; }\
.temple-devtools-toggle-label {\
  display: flex;\
  align-items: center;\
  cursor: pointer;\
  user-select: none;\
  gap: 12px;\
}\
.temple-devtools-toggle-input { display: none; }\
.temple-devtools-toggle-switch {\
  position: relative;\
  width: 44px;\
  height: 24px;\
  background: #cbd5e1;\
  border-radius: 12px;\
  transition: background 0.3s ease;\
  flex-shrink: 0;\
}\
.temple-devtools-toggle-switch::after {\
  content: "";\
  position: absolute;\
  width: 18px;\
  height: 18px;\
  background: white;\
  border-radius: 50%;\
  top: 3px;\
  left: 3px;\
  transition: transform 0.3s ease;\
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);\
}\
.temple-devtools-toggle-input:checked + .temple-devtools-toggle-switch { background: #8b5cf6; }\
.temple-devtools-toggle-input:checked + .temple-devtools-toggle-switch::after { transform: translateX(20px); }\
.temple-devtools-toggle-text { font-size: 14px; color: #374151; flex: 1; }\
.temple-devtools-toggle-label:hover .temple-devtools-toggle-switch { background: #94a3b8; }\
.temple-devtools-toggle-label:hover .temple-devtools-toggle-input:checked + .temple-devtools-toggle-switch { background: #7c3aed; }\
.temple-devtools-outline-preview {\
  padding: 2px 8px;\
  border-radius: 4px;\
  border: 2px dotted transparent;\
}\
.temple-devtools-outline-view { border-color: #3b82f6; background-color: #eff6ff; }\
.temple-devtools-outline-partial { border-color: #10b981; background-color: #ecfdf5; }\
.temple-devtools-outline-component { border-color: #f59e0b; background-color: #fffbeb; }\
.temple-devtools-editor-section {\
  padding: 16px 20px;\
  border-bottom: 1px solid #f3f4f6;\
  background: linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%);\
  position: relative;\
  overflow: hidden;\
}\
.temple-devtools-editor-section::before {\
  content: "";\
  position: absolute;\
  top: 0; left: 0; right: 0; height: 2px;\
  background: linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent);\
}\
.temple-devtools-editor-label {\
  display: flex;\
  flex-direction: column;\
  gap: 10px;\
  cursor: default;\
}\
.temple-devtools-editor-text {\
  font-size: 12px;\
  font-weight: 600;\
  color: #6b7280;\
  text-transform: uppercase;\
  letter-spacing: 0.5px;\
}\
.temple-devtools-editor-select {\
  width: 100%;\
  padding: 10px 36px 10px 12px;\
  background: white;\
  border: 1.5px solid #e5e7eb;\
  border-radius: 8px;\
  font-size: 13.5px;\
  font-weight: 500;\
  color: #1f2937;\
  cursor: pointer;\
  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);\
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;\
  appearance: none;\
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);\
}\
.temple-devtools-editor-select:hover {\
  border-color: #8b5cf6;\
  background-color: #fafafa;\
  box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(139,92,246,0.1);\
}\
.temple-devtools-editor-select:focus {\
  outline: none;\
  border-color: #8b5cf6;\
  box-shadow: 0 0 0 3px rgba(139,92,246,0.15), 0 2px 8px rgba(139,92,246,0.1);\
}\
.temple-devtools-disable-section {\
  padding: 16px 20px;\
  border-top: 1px solid #f3f4f6;\
  background: #f9fafb;\
  border-radius: 0 0 8px 8px;\
}\
.temple-devtools-disable-btn {\
  width: 100%;\
  background: #ef4444;\
  color: white;\
  border: none;\
  padding: 8px 16px;\
  border-radius: 6px;\
  font-size: 13px;\
  font-weight: 500;\
  cursor: pointer;\
  transition: background 0.2s ease;\
}\
.temple-devtools-disable-btn:hover { background: #dc2626; }\
.temple-devtools-disable-btn:active { background: #b91c1c; }\
.temple-devtools-hovered {\
  outline: 2px solid #8b5cf6 !important;\
  outline-offset: 2px !important;\
}\
.temple-devtools-overlay-label {\
  position: absolute;\
  top: -18px;\
  left: 4px;\
  padding: 2px 6px;\
  font-size: 11px;\
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;\
  font-weight: 500;\
  border-radius: 3px;\
  display: block;\
  z-index: 1000;\
  cursor: pointer;\
  transition: all 0.15s ease;\
  white-space: nowrap;\
  line-height: 1.2;\
  border: 1px solid;\
  pointer-events: auto;\
}\
.temple-devtools-overlay-label:hover {\
  filter: brightness(0.95);\
  transform: scale(1.02);\
}\
.temple-devtools-tooltip {\
  position: fixed;\
  background: white;\
  border: 1px solid #e5e7eb;\
  padding: 0;\
  border-radius: 12px;\
  font-family: "SF Mono", Monaco, Inconsolata, "Fira Code", monospace;\
  font-size: 14px;\
  opacity: 0;\
  visibility: hidden;\
  pointer-events: auto;\
  transition: opacity 0.15s ease, visibility 0.15s ease;\
  z-index: 2147483644;\
  box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);\
  display: flex;\
  flex-direction: column;\
  white-space: nowrap;\
  overflow: visible;\
  max-width: calc(100vw - 16px);\
}\
.temple-devtools-tooltip.visible {\
  opacity: 1;\
  visibility: visible;\
}\
.temple-devtools-tooltip::after {\
  content: "";\
  position: absolute;\
  bottom: -6px;\
  left: 50%;\
  transform: translateX(-50%);\
  border: 6px solid transparent;\
  border-top-color: #e5e7eb;\
  pointer-events: none;\
}\
.temple-devtools-location {\
  color: #6b7280;\
  font-size: 13px;\
  font-weight: 500;\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  gap: 12px;\
  cursor: pointer;\
  transition: all 0.2s ease;\
  background: #f8f9fa;\
  padding: 10px 16px;\
  border-radius: 12px 12px 0 0;\
  position: relative;\
}\
.temple-devtools-location:hover {\
  color: #374151;\
  background: #f1f3f4;\
}\
.temple-devtools-location::after {\
  content: attr(data-tooltip);\
  position: absolute;\
  bottom: calc(100% + 8px);\
  left: 50%;\
  transform: translateX(-50%);\
  background: #1f2937;\
  color: white;\
  padding: 6px 10px;\
  border-radius: 6px;\
  font-size: 12px;\
  white-space: nowrap;\
  opacity: 0;\
  visibility: hidden;\
  pointer-events: none;\
  transition: all 0.2s ease;\
}\
.temple-devtools-location:hover::after {\
  opacity: 1;\
  visibility: visible;\
}\
.temple-devtools-location:has(.temple-devtools-copy-btn:hover)::after {\
  opacity: 0 !important;\
  visibility: hidden !important;\
}\
.temple-devtools-filepath { color: #6b7280; }\
.temple-devtools-copy-btn {\
  background: transparent;\
  border: none;\
  font-size: 14px;\
  cursor: pointer;\
  padding: 4px;\
  border-radius: 4px;\
  transition: all 0.2s ease;\
  flex-shrink: 0;\
  position: relative;\
}\
.temple-devtools-copy-btn:hover {\
  background: rgba(107,114,128,0.1);\
}\
.temple-devtools-copy-btn:active { transform: scale(0.95); }\
.temple-devtools-copy-btn::after {\
  content: attr(data-tooltip);\
  position: absolute;\
  top: -36px;\
  left: 50%;\
  transform: translateX(-50%);\
  background: #1f2937;\
  color: white;\
  padding: 6px 10px;\
  border-radius: 6px;\
  font-size: 12px;\
  white-space: nowrap;\
  opacity: 0;\
  visibility: hidden;\
  pointer-events: none;\
  transition: all 0.2s ease;\
}\
.temple-devtools-copy-btn:hover::after {\
  opacity: 1;\
  visibility: visible;\
}\
.temple-devtools-tag-info {\
  padding: 10px 16px;\
  color: #111827;\
  font-size: 15px;\
  font-weight: 600;\
  letter-spacing: -0.025em;\
  border-top: 1px solid #f3f4f6;\
}\
.temple-devtools-outline-stimulus { border-color: #ef4444; background-color: #fef2f2; }\
.temple-devtools-lint-label {\
  position: absolute;\
  top: -18px;\
  left: 4px;\
  background: #fef2f2;\
  color: #991b1b;\
  border: 1px solid #fca5a5;\
  padding: 2px 6px;\
  font-size: 11px;\
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;\
  font-weight: 500;\
  border-radius: 3px;\
  white-space: nowrap;\
  line-height: 1.2;\
  pointer-events: none;\
  z-index: 1000;\
}\
.temple-devtools-stimulus-results {\
  max-height: 200px;\
  overflow-y: auto;\
  margin-top: 8px;\
}\
.temple-devtools-lint-info {\
  color: #6b7280;\
  font-size: 12px;\
  font-style: italic;\
  padding: 4px 0;\
}\
.temple-devtools-lint-ok {\
  color: #059669;\
  font-size: 12px;\
  font-weight: 500;\
  padding: 4px 0;\
}\
.temple-devtools-lint-count {\
  color: #dc2626;\
  font-size: 12px;\
  font-weight: 600;\
  padding: 4px 0;\
}\
.temple-devtools-lint-list {\
  display: flex;\
  flex-direction: column;\
  gap: 4px;\
}\
.temple-devtools-lint-item {\
  font-size: 12px;\
  color: #374151;\
  padding: 4px 6px;\
  border-radius: 4px;\
  cursor: pointer;\
  transition: background 0.15s;\
  display: flex;\
  align-items: center;\
  gap: 6px;\
}\
.temple-devtools-lint-item:hover { background: #f3f4f6; }\
.temple-devtools-lint-badge {\
  font-size: 10px;\
  font-weight: 600;\
  text-transform: uppercase;\
  padding: 1px 4px;\
  border-radius: 3px;\
  flex-shrink: 0;\
}\
.temple-devtools-lint-badge-controller { background: #fef2f2; color: #991b1b; }\
.temple-devtools-lint-badge-target { background: #fffbeb; color: #92400e; }\
.temple-devtools-lint-badge-action { background: #eff6ff; color: #1e40af; }\
.temple-devtools-lint-msg { word-break: break-all; }\
.temple-devtools-metrics-section {\
  border-top: 1px solid #e5e7eb;\
}\
.temple-devtools-metrics-header {\
  padding: 10px 20px 6px;\
  font-size: 12px;\
  font-weight: 600;\
  color: #6b7280;\
  text-transform: uppercase;\
  letter-spacing: 0.5px;\
}\
.temple-devtools-metrics-grid {\
  display: grid;\
  grid-template-columns: 1fr 1fr;\
  gap: 2px;\
  padding: 0 16px 10px;\
}\
.temple-devtools-metric {\
  padding: 6px 8px;\
  border-radius: 6px;\
  background: #f9fafb;\
}\
.temple-devtools-metric-warn { background: #fef3c7; }\
.temple-devtools-metric-ok { background: #ecfdf5; }\
.temple-devtools-metric-value {\
  display: block;\
  font-size: 14px;\
  font-weight: 600;\
  color: #111827;\
}\
.temple-devtools-metric-label {\
  font-size: 11px;\
  color: #6b7280;\
}\
.temple-devtools-metrics-details {\
  padding: 0 16px 8px;\
  font-size: 12px;\
}\
.temple-devtools-metrics-details summary {\
  cursor: pointer;\
  color: #6b7280;\
  font-weight: 500;\
  padding: 4px 0;\
}\
.temple-devtools-metrics-details summary:hover { color: #374151; }\
.temple-devtools-metrics-list {\
  max-height: 150px;\
  overflow-y: auto;\
  margin-top: 4px;\
}\
.temple-devtools-metrics-item {\
  display: flex;\
  gap: 6px;\
  padding: 2px 0;\
  border-bottom: 1px solid #f3f4f6;\
  font-family: ui-monospace, monospace;\
  font-size: 11px;\
}\
.temple-devtools-metrics-dur {\
  color: #8b5cf6;\
  font-weight: 600;\
  flex-shrink: 0;\
  min-width: 45px;\
  text-align: right;\
}\
.temple-devtools-metrics-name {\
  color: #374151;\
  overflow: hidden;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
}\
.temple-devtools-metrics-extra {\
  color: #8b5cf6;\
  font-size: 10px;\
  font-weight: 600;\
}\
';
    document.head.appendChild(style);
  }

  function injectMenu() {
    if (document.querySelector('.temple-devtools-floating-menu')) return;

    var editorOptions = EDITOR_OPTIONS.map(function(e) {
      return '<option value="' + e.value + '">' + e.label + '</option>';
    }).join('');

    var html = '\
<div class="temple-devtools-floating-menu">\
  <button class="temple-devtools-menu-trigger" id="templeMenuTrigger">\
    <span class="temple-devtools-trigger-icon">\u2B21</span>\
    <span class="temple-devtools-trigger-text">DevTools</span>\
  </button>\
  <div class="temple-devtools-panel" id="templeMenuPanel">\
    <div class="temple-devtools-panel-header">Template Debug Tools</div>\
    <div class="temple-devtools-toggle-item">\
      <label class="temple-devtools-toggle-label">\
        <input type="checkbox" id="templeToggleViewOutlines" class="temple-devtools-toggle-input">\
        <span class="temple-devtools-toggle-switch"></span>\
        <span class="temple-devtools-toggle-text temple-devtools-outline-preview temple-devtools-outline-view">View Outlines</span>\
      </label>\
    </div>\
    <div class="temple-devtools-toggle-item">\
      <label class="temple-devtools-toggle-label">\
        <input type="checkbox" id="templeTogglePartialOutlines" class="temple-devtools-toggle-input">\
        <span class="temple-devtools-toggle-switch"></span>\
        <span class="temple-devtools-toggle-text temple-devtools-outline-preview temple-devtools-outline-partial">Partial Outlines</span>\
      </label>\
    </div>\
    <div class="temple-devtools-toggle-item">\
      <label class="temple-devtools-toggle-label">\
        <input type="checkbox" id="templeToggleComponentOutlines" class="temple-devtools-toggle-input">\
        <span class="temple-devtools-toggle-switch"></span>\
        <span class="temple-devtools-toggle-text temple-devtools-outline-preview temple-devtools-outline-component">Component Outlines</span>\
      </label>\
    </div>\
    <div class="temple-devtools-toggle-item">\
      <label class="temple-devtools-toggle-label">\
        <input type="checkbox" id="templeToggleTooltips" class="temple-devtools-toggle-input">\
        <span class="temple-devtools-toggle-switch"></span>\
        <span class="temple-devtools-toggle-text">Hover Tooltips</span>\
      </label>\
    </div>\
    <div class="temple-devtools-toggle-item">\
      <label class="temple-devtools-toggle-label">\
        <input type="checkbox" id="templeToggleStimulusLinter" class="temple-devtools-toggle-input">\
        <span class="temple-devtools-toggle-switch"></span>\
        <span class="temple-devtools-toggle-text temple-devtools-outline-preview temple-devtools-outline-stimulus">Stimulus Linter</span>\
      </label>\
      <div id="templeStimulusResults" class="temple-devtools-stimulus-results"></div>\
    </div>\
    <div id="templeMetricsSection" class="temple-devtools-metrics-section"></div>\
    <div class="temple-devtools-editor-section">\
      <label class="temple-devtools-editor-label">\
        <span class="temple-devtools-editor-text">Editor</span>\
        <select id="templeEditorSelect" class="temple-devtools-editor-select">' + editorOptions + '</select>\
      </label>\
    </div>\
    <div class="temple-devtools-disable-section">\
      <button id="templeDisableAll" class="temple-devtools-disable-btn">Disable All</button>\
    </div>\
  </div>\
</div>';

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function setupMenu() {
    var trigger = document.getElementById('templeMenuTrigger');
    var panel = document.getElementById('templeMenuPanel');
    if (!trigger || !panel) return;
    if (trigger.hasAttribute('data-temple-devtools-bound')) return;
    trigger.setAttribute('data-temple-devtools-bound', 'true');

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      state.menuOpen = !state.menuOpen;
      trigger.classList.toggle('active', state.menuOpen);
      panel.classList.toggle('open', state.menuOpen);
      saveSettings();
    });

    document.addEventListener('click', function(e) {
      var menu = document.querySelector('.temple-devtools-floating-menu');
      if (menu && !menu.contains(e.target) && state.menuOpen) {
        state.menuOpen = false;
        trigger.classList.remove('active');
        panel.classList.remove('open');
        saveSettings();
      }
    });
  }

  function bindToggle(id, stateKey, onChange) {
    var el = document.getElementById(id);
    if (!el || el.hasAttribute('data-temple-devtools-bound')) return;
    el.setAttribute('data-temple-devtools-bound', 'true');
    el.checked = state[stateKey];
    el.addEventListener('change', function() {
      state[stateKey] = el.checked;
      onChange();
      saveSettings();
    });
  }

  function setupToggles() {
    bindToggle('templeToggleViewOutlines', 'showViewOutlines', applyAllOutlines);
    bindToggle('templeTogglePartialOutlines', 'showPartialOutlines', applyAllOutlines);
    bindToggle('templeToggleComponentOutlines', 'showComponentOutlines', applyAllOutlines);
    bindToggle('templeToggleTooltips', 'showTooltips', function() {
      if (!state.showTooltips) removeActiveTooltip();
    });
    bindToggle('templeToggleStimulusLinter', 'showStimulusLinter', function() {
      setTimeout(runStimulusLinter, 150);
    });

    var editorSelect = document.getElementById('templeEditorSelect');
    if (editorSelect && !editorSelect.hasAttribute('data-temple-devtools-bound')) {
      editorSelect.setAttribute('data-temple-devtools-bound', 'true');
      editorSelect.value = state.preferredEditor;
      editorSelect.addEventListener('change', function() {
        state.preferredEditor = editorSelect.value;
        saveSettings();
      });
    }

    var disableBtn = document.getElementById('templeDisableAll');
    if (disableBtn && !disableBtn.hasAttribute('data-temple-devtools-bound')) {
      disableBtn.setAttribute('data-temple-devtools-bound', 'true');
      disableBtn.addEventListener('click', function() {
        state.showViewOutlines = false;
        state.showPartialOutlines = false;
        state.showComponentOutlines = false;
        state.showTooltips = false;
        state.showStimulusLinter = false;
        applyAllOutlines();
        removeActiveTooltip();
        runStimulusLinter();

        ['templeToggleViewOutlines', 'templeTogglePartialOutlines', 'templeToggleComponentOutlines', 'templeToggleTooltips', 'templeToggleStimulusLinter'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.checked = false;
        });
        saveSettings();
      });
    }
  }

  function applySettings() {
    applyAllOutlines();
    renderMetrics();

    if (state.showStimulusLinter) {
      setTimeout(runStimulusLinter, 200);
    }

    var trigger = document.getElementById('templeMenuTrigger');
    var panel = document.getElementById('templeMenuPanel');
    if (trigger && panel && state.menuOpen) {
      trigger.classList.add('active');
      panel.classList.add('open');
    }

    updateMenuButtonState();
  }

  // --- Turbo & DOM mutation support ---

  function reinitialize() {
    invalidateCache();
    loadProjectPath();
    injectStyles();
    injectMenu();
    setupMenu();
    setupToggles();
    // Defer to next frame so the DOM is fully laid out after Turbo navigation
    requestAnimationFrame(function() { applySettings(); });
  }

  // Debounced refresh: recalculates outlines + linter without full reinit
  var refreshTimer = null;
  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(function() {
      refreshTimer = null;
      invalidateCache();
      if (hasActiveOutlines()) applyAllOutlines();
      if (state.showStimulusLinter) runStimulusLinter();
    }, 150);
  }

  // Full page navigation
  document.addEventListener('turbo:load', reinitialize);
  document.addEventListener('turbo:render', reinitialize);

  // Turbo Frames & Streams: content arrives without full page reload
  document.addEventListener('turbo:frame-load', scheduleRefresh);

  // Turbo Streams: inject comment markers inside <template> before Turbo moves
  // the content into the DOM. Without this, markers wrap the <turbo-stream> element
  // which gets discarded, and the actual content has no boundary markers.
  document.addEventListener('turbo:before-stream-render', function(event) {
    var templates = event.target.querySelectorAll
      ? [event.target].filter(function(el) { return el.querySelector('template'); })
      : [];
    if (event.target.tagName === 'TURBO-STREAM') templates = [event.target];

    templates.forEach(function(stream) {
      var tpl = stream.querySelector('template');
      if (!tpl || !tpl.content) return;
      var el = tpl.content.querySelector('[data-devtools-file]');
      if (!el) return;

      var file = el.getAttribute('data-devtools-file');
      var type = el.getAttribute('data-devtools-type') || 'view';
      var short = file.split('/').pop();
      var begin = document.createComment(' temple-devtools-begin file="' + file + '" type="' + type + '" short="' + short + '" ');
      var end = document.createComment(' temple-devtools-end file="' + file + '" ');
      tpl.content.insertBefore(begin, tpl.content.firstChild);
      tpl.content.appendChild(end);
    });

    setTimeout(scheduleRefresh, 50);
  });

  // Global MutationObserver for any DOM changes (lazy loading, AJAX, etc.)
  var globalObserver = new MutationObserver(function() {
    if (hasActiveOutlines() || state.showStimulusLinter) scheduleRefresh();
  });
  globalObserver.observe(document.documentElement, {
    childList: true, subtree: true
  });

  // --- Init ---

  loadSettings();
  loadProjectPath();
  injectStyles();
  injectMenu();
  setupMenu();
  setupToggles();
  // Defer outline rendering until browser completes layout
  requestAnimationFrame(function() { applySettings(); });
})();
