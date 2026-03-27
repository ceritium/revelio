(function() {
  if (window.__revelioLoaded) return;
  window.__revelioLoaded = true;

  var SETTINGS_KEY = 'revelio-settings';
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
    showTurboLinter: false,
    showComponentLinter: false,
    menuOpen: false,
    preferredEditor: 'auto'
  };

  var projectPath = '';
  var activeTooltip = null;
  var activeTooltipElement = null;

  function loadProjectPath() {
    var meta = document.querySelector('meta[name="revelio-project-path"]');
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
        state.showTurboLinter = s.showTurboLinter || false;
        state.showComponentLinter = s.showComponentLinter || false;
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
    return hasActiveOutlines() || state.showTooltips || state.showStimulusLinter || state.showTurboLinter || state.showComponentLinter;
  }

  function updateMenuButtonState() {
    var trigger = document.getElementById('revelioMenuTrigger');
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
      case 'vscode':   return 'vscode://file/' + abs + ':' + line;
      case 'cursor':   return 'cursor://file/' + abs + ':' + line;
      case 'rubymine': return 'x-mine://open?file=' + abs + '&line=' + line;
      case 'zed':      return 'zed://file/' + abs + ':' + line;
      case 'windsurf': return 'windsurf://file/' + abs + ':' + line;
      case 'sublime':  return 'subl://open?url=file://' + abs + '&line=' + line;
      case 'idea':     return 'idea://open?file=' + abs + '&line=' + line;
      case 'atom':     return 'atom://open?url=file://' + abs + '&line=' + line;
      case 'emacs':    return 'emacs://open?url=file://' + abs + '&line=' + line;
      case 'nvim':     return 'nvim://open?file=' + abs + '&line=' + line;
      case 'vim':      return 'vim://open?file=' + abs + '&line=' + line;
      case 'macvim':   return 'mvim://open?url=file://' + abs + '&line=' + line;
      case 'textmate': return 'txmt://open?url=file://' + abs + '&line=' + line;
      case 'nova':     return 'nova://open?path=' + abs + '&line=' + line;
      case 'vscodium': return 'vscodium://file/' + abs + ':' + line;
      default:         return 'vscode://file/' + abs + ':' + line;
    }
  }

  function openInEditor(filePath, line) {
    var editor = state.preferredEditor === 'auto' ? 'vscode' : state.preferredEditor;
    window.open(getEditorUrl(editor, filePath, line), '_self');
  }

  // --- Tooltip ---

  function removeActiveTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    if (activeTooltipElement) {
      activeTooltipElement.classList.remove('revelio-hovered');
      activeTooltipElement = null;
    }
  }

  function createTooltip(element) {
    if (activeTooltipElement === element) return;
    removeActiveTooltip();

    var file = element.getAttribute('data-revelio-file') || '';
    var line = element.getAttribute('data-revelio-line') || '';
    if (!file) return;

    activeTooltipElement = element;
    element.classList.add('revelio-hovered');

    var tooltip = document.createElement('div');
    tooltip.className = 'revelio-tooltip';

    var location = document.createElement('div');
    location.className = 'revelio-location';
    location.setAttribute('data-tooltip', 'Open in editor');

    var pathSpan = document.createElement('span');
    pathSpan.className = 'revelio-filepath';
    pathSpan.textContent = file + ':' + line;
    location.appendChild(pathSpan);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'revelio-copy-btn';
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
      if (e.target.closest('.revelio-copy-btn')) return;
      e.preventDefault();
      e.stopPropagation();
      openInEditor(file, line);
    });

    tooltip.appendChild(location);

    var tagInfo = document.createElement('div');
    tagInfo.className = 'revelio-tag-info';
    var tag = element.tagName.toLowerCase();
    var id = element.id ? '#' + element.id : '';
    var cls = element.className
      ? '.' + element.className.split(/\s+/).filter(function(c) { return c.indexOf('revelio') === -1; }).join('.')
      : '';
    if (cls === '.') cls = '';
    if (file.match(/\.haml$/i)) {
      tagInfo.textContent = '%' + tag + id + cls;
    } else if (file.match(/\.slim$/i)) {
      tagInfo.textContent = tag + id + cls;
    } else {
      var rawCls = element.className
        ? element.className.split(/\s+/).filter(function(c) { return c.indexOf('revelio') === -1; }).join(' ')
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
      if (text.indexOf('revelio-begin') === 0) {
        openStack.push(walker.currentNode);
      } else if (text.indexOf('revelio-end') === 0 && openStack.length) {
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
    var el = document.getElementById('revelio-metrics');
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
    overlay.className = 'revelio-boundary-overlay';
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
    label.className = 'revelio-overlay-label';
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
    var section = document.getElementById('revelioMetricsSection');
    if (!section) return;

    var el = document.getElementById('revelio-metrics');
    if (!el) { section.innerHTML = ''; return; }

    try {
      var m = JSON.parse(el.textContent);
    } catch(e) { return; }

    var html = '<details class="revelio-section" open>';
    html += '<summary>Request</summary>';
    html += '<div class="revelio-metrics-grid">';
    var t = m.thresholds || {};
    html += metric('Duration', m.duration + 'ms', m.duration > (t.duration || 200) ? 'warn' : 'ok');
    html += metric('Queries', m.queries + ' (' + m.query_time + 'ms)', m.queries > (t.queries || 20) ? 'warn' : 'ok');
    html += metric('Renders', m.renders + ' (' + m.render_time + 'ms)', '');
    html += metric('GC alloc', m.gc_objects.toLocaleString() + ' obj', m.gc_objects > (t.gc_objects || 100000) ? 'warn' : '');
    html += '</div>';

    // Query details (collapsible)
    if (m.details && m.details.queries && m.details.queries.length > 0) {
      html += '<details class="revelio-metrics-details">';
      html += '<summary>' + m.details.queries.length + ' queries</summary>';
      html += '<div class="revelio-metrics-list">';
      m.details.queries.forEach(function(q) {
        html += '<div class="revelio-metrics-item">';
        html += '<span class="revelio-metrics-dur">' + q.duration + 'ms</span> ';
        html += '<span class="revelio-metrics-name">' + escapeHtml(q.name || 'SQL') + '</span>';
        html += '</div>';
      });
      html += '</div></details>';
    }

    // Render details
    if (m.details && m.details.renders && m.details.renders.length > 0) {
      html += '<details class="revelio-metrics-details">';
      html += '<summary>' + m.details.renders.length + ' renders</summary>';
      html += '<div class="revelio-metrics-list">';
      m.details.renders.forEach(function(r) {
        var extra = [];
        if (r.queries > 0) extra.push(r.queries + 'q ' + r.query_time + 'ms');
        if (r.gc_objects > 0) extra.push(r.gc_objects.toLocaleString() + ' alloc');
        var suffix = extra.length > 0 ? ' <span class="revelio-metrics-extra">' + extra.join(' | ') + '</span>' : '';
        html += '<div class="revelio-metrics-item">';
        html += '<span class="revelio-metrics-dur">' + r.duration + 'ms</span> ';
        html += '<span class="revelio-metrics-name">' + escapeHtml(r.template) + suffix + '</span>';
        html += '</div>';
      });
      html += '</div></details>';
    }

    html += '</details>';
    section.innerHTML = html;
  }

  function metric(label, value, cls) {
    return '<div class="revelio-metric' + (cls ? ' revelio-metric-' + cls : '') + '">' +
      '<span class="revelio-metric-value">' + value + '</span>' +
      '<span class="revelio-metric-label">' + label + '</span>' +
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
      if (el.closest('.revelio-floating-menu')) return;
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
        if (el.closest('.revelio-floating-menu')) return;
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
      if (el.closest('.revelio-floating-menu')) return;
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
      overlay.className = 'revelio-lint-overlay';
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
      label.className = 'revelio-lint-label';
      label.textContent = issue.message;
      overlay.appendChild(label);

      document.body.appendChild(overlay);
      stimulusLintOverlays.push(overlay);
    });
  }

  function renderStimulusResults(issues) {
    var container = document.getElementById('revelioStimulusResults');
    if (!container) return;

    if (!getStimulusApp()) {
      container.innerHTML = '<div class="revelio-lint-info">Stimulus not found on window.Stimulus</div>';
      return;
    }

    if (issues.length === 0) {
      container.innerHTML = '<div class="revelio-lint-ok">No issues found</div>';
      return;
    }

    var html = '<div class="revelio-lint-count">' + issues.length + ' issue' + (issues.length > 1 ? 's' : '') + '</div>';
    html += '<div class="revelio-lint-list">';
    issues.forEach(function(issue, i) {
      html += '<div class="revelio-lint-item" data-lint-index="' + i + '">';
      html += '<span class="revelio-lint-badge revelio-lint-badge-' + issue.type + '">' + issue.type + '</span> ';
      html += '<span class="revelio-lint-msg">' + issue.message + '</span>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    // Click to scroll to element
    container.querySelectorAll('.revelio-lint-item').forEach(function(item) {
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
      var container = document.getElementById('revelioStimulusResults');
      if (container) container.innerHTML = '';
      return;
    }
    var issues = scanStimulusIssues();
    applyStimulusLintOverlays(issues);
    renderStimulusResults(issues);
  }


  // --- Turbo Linter ---

  var turboLintOverlays = [];

  function scanTurboIssues() {
    var issues = [];

    // Check 1: <turbo-frame> without id
    document.querySelectorAll('turbo-frame').forEach(function(el) {
      if (el.closest('.revelio-floating-menu')) return;
      if (!el.id) {
        issues.push({ type: 'frame', element: el,
          message: '<turbo-frame> missing required "id" attribute' });
      }
    });

    // Check 2: data-turbo-frame pointing to non-existent frame
    document.querySelectorAll('[data-turbo-frame]').forEach(function(el) {
      if (el.closest('.revelio-floating-menu')) return;
      var frameId = el.getAttribute('data-turbo-frame');
      if (!frameId || frameId === '_top') return;
      if (!document.getElementById(frameId) || document.getElementById(frameId).tagName.toLowerCase() !== 'turbo-frame') {
        issues.push({ type: 'reference', element: el,
          message: 'data-turbo-frame="' + frameId + '" points to non-existent frame' });
      }
    });

    return issues;
  }

  function clearTurboLintOverlays() {
    turboLintOverlays.forEach(function(o) { o.remove(); });
    turboLintOverlays = [];
  }

  function applyTurboLintOverlays(issues) {
    clearTurboLintOverlays();
    issues.forEach(function(issue) {
      var rect = issue.element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      var scrollX = window.scrollX;
      var scrollY = window.scrollY;

      var overlay = document.createElement('div');
      overlay.className = 'revelio-lint-overlay';
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
      label.className = 'revelio-lint-label';
      label.textContent = issue.message;
      overlay.appendChild(label);

      document.body.appendChild(overlay);
      turboLintOverlays.push(overlay);
    });
  }

  function renderTurboResults(issues) {
    var container = document.getElementById('revelioTurboResults');
    if (!container) return;

    if (issues.length === 0) {
      container.innerHTML = '<div class="revelio-lint-ok">No issues found</div>';
      return;
    }

    var html = '<div class="revelio-lint-count">' + issues.length + ' issue' + (issues.length > 1 ? 's' : '') + '</div>';
    html += '<div class="revelio-lint-list">';
    issues.forEach(function(issue, i) {
      html += '<div class="revelio-lint-item" data-turbo-lint-index="' + i + '">';
      html += '<span class="revelio-lint-badge revelio-lint-badge-' + issue.type + '">' + issue.type + '</span> ';
      html += '<span class="revelio-lint-msg">' + issue.message + '</span>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    // Click to scroll to element
    container.querySelectorAll('.revelio-lint-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var idx = parseInt(item.getAttribute('data-turbo-lint-index'));
        var el = issues[idx] && issues[idx].element;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.outline = '3px solid #ef4444';
          setTimeout(function() { el.style.outline = ''; }, 1500);
        }
      });
    });
  }

  function runTurboLinter() {
    if (!state.showTurboLinter) {
      clearTurboLintOverlays();
      var container = document.getElementById('revelioTurboResults');
      if (container) container.innerHTML = '';
      return;
    }
    var issues = scanTurboIssues();
    applyTurboLintOverlays(issues);
    renderTurboResults(issues);
  }


  // --- Component Linter ---

  var componentLintOverlays = [];

  function getComponentInventory() {
    var m = getMetrics();
    if (!m || !m.details || !m.details.renders) return [];
    var map = {};
    m.details.renders.forEach(function(r) {
      if (!r.template || r.template.indexOf('components/') === -1) return;
      var name = r.template.split('/').pop().replace(/\.html\.\w+$/, '');
      if (!map[name]) {
        map[name] = { name: name, template: r.template, count: 0, duration: 0, queries: 0, gc_objects: 0 };
      }
      map[name].count++;
      map[name].duration += r.duration;
      map[name].queries += (r.queries || 0);
      map[name].gc_objects += (r.gc_objects || 0);
    });
    return Object.keys(map).map(function(k) { return map[k]; })
      .sort(function(a, b) { return b.duration - a.duration; });
  }

  function scanEmptyComponents() {
    var boundaries = findTemplateBoundaries();
    var issues = [];
    boundaries.forEach(function(b) {
      if (b.type !== 'component') return;
      var node = b.beginNode.nextSibling;
      var hasVisibleContent = false;
      while (node && node !== b.endNode) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          var text = (node.textContent || '').trim();
          var rect = node.getBoundingClientRect();
          if (text.length > 0 || (rect.width > 0 && rect.height > 0 && node.children.length > 0)) {
            hasVisibleContent = true;
            break;
          }
        }
        node = node.nextSibling;
      }
      if (!hasVisibleContent) {
        // Find the first element inside the boundary for highlighting
        var el = b.beginNode.nextSibling;
        while (el && el !== b.endNode && el.nodeType !== Node.ELEMENT_NODE) el = el.nextSibling;
        if (el && el !== b.endNode) {
          issues.push({ type: 'empty', element: el, identifier: b.short,
            message: b.short + ' rendered with no visible content' });
        }
      }
    });
    return issues;
  }

  function clearComponentLintOverlays() {
    componentLintOverlays.forEach(function(o) { o.remove(); });
    componentLintOverlays = [];
  }

  function applyComponentLintOverlays(issues) {
    clearComponentLintOverlays();
    issues.forEach(function(issue) {
      var rect = issue.element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      var scrollX = window.scrollX;
      var scrollY = window.scrollY;

      var overlay = document.createElement('div');
      overlay.className = 'revelio-lint-overlay';
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
      label.className = 'revelio-lint-label';
      label.textContent = issue.message;
      overlay.appendChild(label);

      document.body.appendChild(overlay);
      componentLintOverlays.push(overlay);
    });
  }

  function renderComponentResults(inventory, emptyIssues) {
    var container = document.getElementById('revelioComponentResults');
    if (!container) return;

    var html = '';

    // Inventory
    if (inventory.length > 0) {
      html += '<div class="revelio-component-inventory">';
      inventory.forEach(function(c) {
        var durStr = c.duration < 0.1 ? '<0.1ms' : c.duration.toFixed(1) + 'ms';
        html += '<div class="revelio-component-item">';
        html += '<span class="revelio-component-name">' + c.name + '</span>';
        html += '<span class="revelio-component-stats">';
        html += c.count + 'x &middot; ' + durStr;
        if (c.queries > 0) html += ' &middot; ' + c.queries + 'q';
        html += '</span>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="revelio-lint-info">No components rendered</div>';
    }

    // Empty component issues
    if (emptyIssues.length > 0) {
      html += '<div class="revelio-lint-count">' + emptyIssues.length + ' empty component' + (emptyIssues.length > 1 ? 's' : '') + '</div>';
      html += '<div class="revelio-lint-list">';
      emptyIssues.forEach(function(issue, i) {
        html += '<div class="revelio-lint-item" data-component-lint-index="' + i + '">';
        html += '<span class="revelio-lint-badge revelio-lint-badge-empty">empty</span> ';
        html += '<span class="revelio-lint-msg">' + issue.message + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Click to scroll to empty component
    container.querySelectorAll('[data-component-lint-index]').forEach(function(item) {
      item.addEventListener('click', function() {
        var idx = parseInt(item.getAttribute('data-component-lint-index'));
        var el = emptyIssues[idx] && emptyIssues[idx].element;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.outline = '3px solid #ef4444';
          setTimeout(function() { el.style.outline = ''; }, 1500);
        }
      });
    });
  }

  function runComponentLinter() {
    if (!state.showComponentLinter) {
      clearComponentLintOverlays();
      var container = document.getElementById('revelioComponentResults');
      if (container) container.innerHTML = '';
      return;
    }
    invalidateCache();
    var inventory = getComponentInventory();
    var emptyIssues = scanEmptyComponents();
    applyComponentLintOverlays(emptyIssues);
    renderComponentResults(inventory, emptyIssues);
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
    var el = e.target.closest('[data-revelio-file]');
    if (el) { createTooltip(el); return; }

    // Fallback for ERB: find containing comment boundary
    var target = e.target;
    if (target.nodeType !== Node.ELEMENT_NODE) return;
    if (target.closest('.revelio-floating-menu')) return;
    if (target.closest('.revelio-tooltip')) return;
    var boundary = findBoundaryForElement(target);
    if (boundary) {
      target.setAttribute('data-revelio-file', boundary.file);
      target.setAttribute('data-revelio-line', '1');
      createTooltip(target);
    }
  });

  // --- Floating Menu ---

  function injectStyles() {
    if (document.getElementById('revelio-styles')) return;
    var style = document.createElement('style');
    style.id = 'revelio-styles';
    style.textContent = '.revelio-floating-menu { position: fixed; top: 0; right: 0; z-index: 2147483643; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; } .revelio-menu-trigger { padding: 4px 7px; border-radius: 0 0 0 10px; background: white; border: 1px solid #c0c0c0; border-top: none; border-right: none; box-shadow: 0px 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 4px; z-index: 2147483640; font-size: 12px; } .revelio-menu-trigger:hover { background: #f9fafb; border-color: #9ca3af; box-shadow: 0 4px 12px rgba(0,0,0,0.15); } .revelio-menu-trigger:active { transform: scale(0.98); } .revelio-menu-trigger.has-active-options { background: #dbeafe; border-color: #3b82f6; } .revelio-menu-trigger.has-active-options:hover { background: #bfdbfe; border-color: #2563eb; } .revelio-menu-trigger.has-active-options .revelio-trigger-text { color: #1d4ed8; } .revelio-trigger-icon { font-size: 14px; line-height: 1; } .revelio-trigger-text { font-size: 11px; font-weight: 600; color: #555; letter-spacing: 0.2px; } .revelio-panel { position: absolute; top: 28px; right: 10px; background: white; border-radius: 6px; border: 1px solid #c0c0c0; box-shadow: 0px 2px 8px rgba(0,0,0,0.1); padding: 0; min-width: 220px; opacity: 0; visibility: hidden; transform: translateY(-10px) scale(0.95); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); transform-origin: top right; } .revelio-panel.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); } .revelio-panel-body { max-height: calc(100vh - 80px); overflow-y: auto; } .revelio-panel-header { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 11px; color: #374151; background: #f9fafb; border-radius: 6px 6px 0 0; } .revelio-section { border-bottom: 1px solid #f3f4f6; } .revelio-section:last-child { border-bottom: none; } .revelio-section > summary { padding: 6px 12px; font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; list-style: none; display: flex; align-items: center; gap: 4px; user-select: none; } .revelio-section > summary::-webkit-details-marker { display: none; } .revelio-section > summary::before { content: ""; display: inline-block; width: 0; height: 0; border-style: solid; border-width: 4px 0 4px 5px; border-color: transparent transparent transparent #9ca3af; transition: transform 0.15s; flex-shrink: 0; } .revelio-section[open] > summary::before { transform: rotate(90deg); } .revelio-toggle-item { padding: 4px 12px; } .revelio-toggle-item:last-child { border-bottom: none; } .revelio-toggle-label { display: flex; align-items: center; cursor: pointer; user-select: none; gap: 8px; } .revelio-toggle-input { display: none; } .revelio-toggle-switch { position: relative; width: 32px; height: 18px; background: #cbd5e1; border-radius: 9px; transition: background 0.3s ease; flex-shrink: 0; } .revelio-toggle-switch::after { content: ""; position: absolute; width: 14px; height: 14px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.2); } .revelio-toggle-input:checked + .revelio-toggle-switch { background: #8b5cf6; } .revelio-toggle-input:checked + .revelio-toggle-switch::after { transform: translateX(14px); } .revelio-toggle-text { font-size: 12px; color: #374151; flex: 1; } .revelio-toggle-label:hover .revelio-toggle-switch { background: #94a3b8; } .revelio-toggle-label:hover .revelio-toggle-input:checked + .revelio-toggle-switch { background: #7c3aed; } .revelio-outline-preview { padding: 2px 8px; border-radius: 4px; border: 2px dotted transparent; } .revelio-outline-view { border-color: #3b82f6; background-color: #eff6ff; } .revelio-outline-partial { border-color: #10b981; background-color: #ecfdf5; } .revelio-outline-component { border-color: #f59e0b; background-color: #fffbeb; } .revelio-editor-section { padding: 4px 12px 8px; } .revelio-editor-label { display: flex; flex-direction: column; gap: 6px; cursor: default; } .revelio-editor-text { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; } .revelio-editor-select { width: 100%; padding: 6px 28px 6px 8px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 12px; font-weight: 500; color: #1f2937; cursor: pointer; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; appearance: none; box-shadow: 0 1px 2px rgba(0,0,0,0.05); } .revelio-editor-select:hover { border-color: #8b5cf6; background-color: #fafafa; box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(139,92,246,0.1); } .revelio-editor-select:focus { outline: none; border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.15), 0 2px 8px rgba(139,92,246,0.1); } .revelio-disable-section { padding: 4px 12px 8px; } .revelio-disable-btn { width: 100%; background: #ef4444; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: background 0.2s ease; } .revelio-disable-btn:hover { background: #dc2626; } .revelio-disable-btn:active { background: #b91c1c; } .revelio-hovered { outline: 2px solid #8b5cf6 !important; outline-offset: 2px !important; } .revelio-overlay-label { position: absolute; top: -18px; left: 4px; padding: 2px 6px; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-weight: 500; border-radius: 3px; display: block; z-index: 1000; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; line-height: 1.2; border: 1px solid; pointer-events: auto; } .revelio-overlay-label:hover { filter: brightness(0.95); transform: scale(1.02); } .revelio-tooltip { position: fixed; background: white; border: 1px solid #e5e7eb; padding: 0; border-radius: 12px; font-family: "SF Mono", Monaco, Inconsolata, "Fira Code", monospace; font-size: 14px; opacity: 0; visibility: hidden; pointer-events: auto; transition: opacity 0.15s ease, visibility 0.15s ease; z-index: 2147483644; box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08); display: flex; flex-direction: column; white-space: nowrap; overflow: visible; max-width: calc(100vw - 16px); } .revelio-tooltip.visible { opacity: 1; visibility: visible; } .revelio-tooltip::after { content: ""; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #e5e7eb; pointer-events: none; } .revelio-location { color: #6b7280; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; transition: all 0.2s ease; background: #f8f9fa; padding: 10px 16px; border-radius: 12px 12px 0 0; position: relative; } .revelio-location:hover { color: #374151; background: #f1f3f4; } .revelio-location::after { content: attr(data-tooltip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #1f2937; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none; transition: all 0.2s ease; } .revelio-location:hover::after { opacity: 1; visibility: visible; } .revelio-location:has(.revelio-copy-btn:hover)::after { opacity: 0 !important; visibility: hidden !important; } .revelio-filepath { color: #6b7280; } .revelio-copy-btn { background: transparent; border: none; font-size: 14px; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s ease; flex-shrink: 0; position: relative; } .revelio-copy-btn:hover { background: rgba(107,114,128,0.1); } .revelio-copy-btn:active { transform: scale(0.95); } .revelio-copy-btn::after { content: attr(data-tooltip); position: absolute; top: -36px; left: 50%; transform: translateX(-50%); background: #1f2937; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none; transition: all 0.2s ease; } .revelio-copy-btn:hover::after { opacity: 1; visibility: visible; } .revelio-tag-info { padding: 10px 16px; color: #111827; font-size: 15px; font-weight: 600; letter-spacing: -0.025em; border-top: 1px solid #f3f4f6; } .revelio-outline-stimulus { border-color: #ef4444; background-color: #fef2f2; } .revelio-lint-label { position: absolute; top: -18px; left: 4px; background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; padding: 2px 6px; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-weight: 500; border-radius: 3px; white-space: nowrap; line-height: 1.2; pointer-events: none; z-index: 1000; } .revelio-stimulus-results { max-height: 200px; overflow-y: auto; margin-top: 8px; } .revelio-lint-info { color: #6b7280; font-size: 12px; font-style: italic; padding: 4px 0; } .revelio-lint-ok { color: #059669; font-size: 12px; font-weight: 500; padding: 4px 0; } .revelio-lint-count { color: #dc2626; font-size: 12px; font-weight: 600; padding: 4px 0; } .revelio-lint-list { display: flex; flex-direction: column; gap: 4px; } .revelio-lint-item { font-size: 12px; color: #374151; padding: 4px 6px; border-radius: 4px; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 6px; } .revelio-lint-item:hover { background: #f3f4f6; } .revelio-lint-badge { font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 1px 4px; border-radius: 3px; flex-shrink: 0; } .revelio-lint-badge-controller { background: #fef2f2; color: #991b1b; } .revelio-lint-badge-target { background: #fffbeb; color: #92400e; } .revelio-lint-badge-action { background: #eff6ff; color: #1e40af; } .revelio-lint-badge-frame { background: #f0fdf4; color: #166534; } .revelio-lint-badge-reference { background: #faf5ff; color: #6b21a8; } .revelio-lint-badge-empty { background: #fef3c7; color: #92400e; } .revelio-component-inventory { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; } .revelio-component-item { display: flex; justify-content: space-between; align-items: center; padding: 3px 6px; font-size: 12px; border-radius: 3px; } .revelio-component-item:hover { background: #f3f4f6; } .revelio-component-name { color: #374151; font-weight: 500; } .revelio-component-stats { color: #9ca3af; font-size: 11px; white-space: nowrap; } .revelio-lint-msg { word-break: break-all; } .revelio-metrics-section { border-top: 1px solid #e5e7eb; } .revelio-metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 0 16px 10px; } .revelio-metric { padding: 6px 8px; border-radius: 6px; background: #f9fafb; } .revelio-metric-warn { background: #fef3c7; } .revelio-metric-ok { background: #ecfdf5; } .revelio-metric-value { display: block; font-size: 14px; font-weight: 600; color: #111827; } .revelio-metric-label { font-size: 11px; color: #6b7280; } .revelio-metrics-details { padding: 0 16px 8px; font-size: 12px; } .revelio-metrics-details summary { cursor: pointer; color: #6b7280; font-weight: 500; padding: 4px 0; } .revelio-metrics-details summary:hover { color: #374151; } .revelio-metrics-list { max-height: 150px; overflow-y: auto; margin-top: 4px; } .revelio-metrics-item { display: flex; gap: 6px; padding: 2px 0; border-bottom: 1px solid #f3f4f6; font-family: ui-monospace, monospace; font-size: 11px; } .revelio-metrics-dur { color: #8b5cf6; font-weight: 600; flex-shrink: 0; min-width: 45px; text-align: right; } .revelio-metrics-name { color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .revelio-metrics-extra { color: #8b5cf6; font-size: 10px; font-weight: 600; }';
    document.head.appendChild(style);
  }

  function injectMenu() {
    if (document.querySelector('.revelio-floating-menu')) return;

    var editorOptions = EDITOR_OPTIONS.map(function(e) {
      return '<option value="' + e.value + '">' + e.label + '</option>';
    }).join('');

    var html = '<div class="revelio-floating-menu"><button class="revelio-menu-trigger" id="revelioMenuTrigger"><span class="revelio-trigger-icon">&#x2B21;</span><span class="revelio-trigger-text">Revelio</span></button><div class="revelio-panel" id="revelioMenuPanel"><div class="revelio-panel-header">Revelio</div><div class="revelio-panel-body"><details class="revelio-section" open><summary>Outlines</summary><div class="revelio-toggle-item"><label class="revelio-toggle-label"><input type="checkbox" id="revelioToggleViewOutlines" class="revelio-toggle-input"><span class="revelio-toggle-switch"></span><span class="revelio-toggle-text revelio-outline-preview revelio-outline-view">Views</span></label></div><div class="revelio-toggle-item"><label class="revelio-toggle-label"><input type="checkbox" id="revelioTogglePartialOutlines" class="revelio-toggle-input"><span class="revelio-toggle-switch"></span><span class="revelio-toggle-text revelio-outline-preview revelio-outline-partial">Partials</span></label></div><div class="revelio-toggle-item"><label class="revelio-toggle-label"><input type="checkbox" id="revelioToggleComponentOutlines" class="revelio-toggle-input"><span class="revelio-toggle-switch"></span><span class="revelio-toggle-text revelio-outline-preview revelio-outline-component">Components</span></label></div><div class="revelio-toggle-item"><label class="revelio-toggle-label"><input type="checkbox" id="revelioToggleTooltips" class="revelio-toggle-input"><span class="revelio-toggle-switch"></span><span class="revelio-toggle-text">Hover Tooltips</span></label></div></details><details class="revelio-section" open><summary>Linters</summary><div class="revelio-toggle-item"><label class="revelio-toggle-label"><input type="checkbox" id="revelioToggleStimulusLinter" class="revelio-toggle-input"><span class="revelio-toggle-switch"></span><span class="revelio-toggle-text revelio-outline-preview revelio-outline-stimulus">Stimulus</span></label><div id="revelioStimulusResults" class="revelio-stimulus-results"></div></div><div class="revelio-toggle-item"><label class="revelio-toggle-label"><input type="checkbox" id="revelioToggleTurboLinter" class="revelio-toggle-input"><span class="revelio-toggle-switch"></span><span class="revelio-toggle-text revelio-outline-preview revelio-outline-stimulus">Turbo</span></label><div id="revelioTurboResults" class="revelio-stimulus-results"></div></div><div class="revelio-toggle-item"><label class="revelio-toggle-label"><input type="checkbox" id="revelioToggleComponentLinter" class="revelio-toggle-input"><span class="revelio-toggle-switch"></span><span class="revelio-toggle-text revelio-outline-preview revelio-outline-component">Component Inspector</span></label><div id="revelioComponentResults" class="revelio-stimulus-results"></div></div></details><div id="revelioMetricsSection" class="revelio-metrics-section"></div><details class="revelio-section" open><summary>Settings</summary><div class="revelio-editor-section"><label class="revelio-editor-label"><span class="revelio-editor-text">Editor</span><select id="revelioEditorSelect" class="revelio-editor-select">__REVELIO_EDITOR_OPTIONS__</select></label></div><div class="revelio-disable-section"><button id="revelioDisableAll" class="revelio-disable-btn">Disable All</button></div></details></div></div></div>';
    html = html.replace('__REVELIO_EDITOR_OPTIONS__', editorOptions);

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function setupMenu() {
    var trigger = document.getElementById('revelioMenuTrigger');
    var panel = document.getElementById('revelioMenuPanel');
    if (!trigger || !panel) return;
    if (trigger.hasAttribute('data-revelio-bound')) return;
    trigger.setAttribute('data-revelio-bound', 'true');

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      state.menuOpen = !state.menuOpen;
      trigger.classList.toggle('active', state.menuOpen);
      panel.classList.toggle('open', state.menuOpen);
      saveSettings();
    });

    document.addEventListener('click', function(e) {
      var menu = document.querySelector('.revelio-floating-menu');
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
    if (!el || el.hasAttribute('data-revelio-bound')) return;
    el.setAttribute('data-revelio-bound', 'true');
    el.checked = state[stateKey];
    el.addEventListener('change', function() {
      state[stateKey] = el.checked;
      onChange();
      saveSettings();
    });
  }

  function setupToggles() {
    bindToggle('revelioToggleViewOutlines', 'showViewOutlines', applyAllOutlines);
    bindToggle('revelioTogglePartialOutlines', 'showPartialOutlines', applyAllOutlines);
    bindToggle('revelioToggleComponentOutlines', 'showComponentOutlines', applyAllOutlines);
    bindToggle('revelioToggleTooltips', 'showTooltips', function() {
      if (!state.showTooltips) removeActiveTooltip();
    });
    bindToggle('revelioToggleStimulusLinter', 'showStimulusLinter', function() {
      setTimeout(runStimulusLinter, 150);
    });
    bindToggle('revelioToggleTurboLinter', 'showTurboLinter', function() {
      setTimeout(runTurboLinter, 150);
    });
    bindToggle('revelioToggleComponentLinter', 'showComponentLinter', function() {
      setTimeout(runComponentLinter, 150);
    });

    var editorSelect = document.getElementById('revelioEditorSelect');
    if (editorSelect && !editorSelect.hasAttribute('data-revelio-bound')) {
      editorSelect.setAttribute('data-revelio-bound', 'true');
      editorSelect.value = state.preferredEditor;
      editorSelect.addEventListener('change', function() {
        state.preferredEditor = editorSelect.value;
        saveSettings();
      });
    }

    var disableBtn = document.getElementById('revelioDisableAll');
    if (disableBtn && !disableBtn.hasAttribute('data-revelio-bound')) {
      disableBtn.setAttribute('data-revelio-bound', 'true');
      disableBtn.addEventListener('click', function() {
        state.showViewOutlines = false;
        state.showPartialOutlines = false;
        state.showComponentOutlines = false;
        state.showTooltips = false;
        state.showStimulusLinter = false;
        state.showTurboLinter = false;
        state.showComponentLinter = false;
        applyAllOutlines();
        removeActiveTooltip();
        runStimulusLinter();
        runTurboLinter();
        runComponentLinter();

        ['revelioToggleViewOutlines', 'revelioTogglePartialOutlines', 'revelioToggleComponentOutlines', 'revelioToggleTooltips', 'revelioToggleStimulusLinter', 'revelioToggleTurboLinter', 'revelioToggleComponentLinter'].forEach(function(id) {
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
    if (state.showTurboLinter) {
      setTimeout(runTurboLinter, 200);
    }
    if (state.showComponentLinter) {
      setTimeout(runComponentLinter, 200);
    }

    var trigger = document.getElementById('revelioMenuTrigger');
    var panel = document.getElementById('revelioMenuPanel');
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
      if (state.showTurboLinter) runTurboLinter();
      if (state.showComponentLinter) runComponentLinter();
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
      var el = tpl.content.querySelector('[data-revelio-file]');
      if (!el) return;

      var file = el.getAttribute('data-revelio-file');
      var type = el.getAttribute('data-revelio-type') || 'view';
      var short = file.split('/').pop();
      var begin = document.createComment(' revelio-begin file="' + file + '" type="' + type + '" short="' + short + '" ');
      var end = document.createComment(' revelio-end file="' + file + '" ');
      tpl.content.insertBefore(begin, tpl.content.firstChild);
      tpl.content.appendChild(end);
    });

    setTimeout(scheduleRefresh, 50);
  });

  // Global MutationObserver for any DOM changes (lazy loading, AJAX, etc.)
  var globalObserver = new MutationObserver(function(mutations) {
    // Ignore mutations caused by our own overlays/tooltips/menu
    var dominated = mutations.every(function(m) {
      var t = m.target;
      // Ignore mutations inside our own elements
      if (t.closest && (t.closest('.revelio-boundary-overlay') ||
        t.closest('.revelio-floating-menu') ||
        t.closest('.revelio-tooltip') ||
        t.closest('.revelio-lint-overlay'))) return true;
      // Ignore our overlays being added/removed from body
      if (m.type === 'childList') {
        var dominated = true;
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1 && n.className && typeof n.className === 'string' &&
              n.className.indexOf('revelio-') === 0) return;
          dominated = false;
        });
        m.removedNodes.forEach(function(n) {
          if (n.nodeType === 1 && n.className && typeof n.className === 'string' &&
              n.className.indexOf('revelio-') === 0) return;
          dominated = false;
        });
        return dominated;
      }
      return false;
    });
    if (dominated) return;
    if (hasActiveOutlines() || state.showStimulusLinter || state.showTurboLinter || state.showComponentLinter) scheduleRefresh();
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
