// DevTools panel: receives data from content script, renders UI
(function () {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  let port = null;
  let currentData = null;
  let turboStreamLog = [];

  // --- Connection ---

  function connect() {
    port = chrome.runtime.connect({ name: 'revelio-panel' });
    port.postMessage({ type: 'init', tabId });

    port.onMessage.addListener((msg) => {
      if (msg.type === 'page-data') {
        currentData = msg.payload;
        renderActiveTab();
      } else if (msg.type === 'toggle-states') {
        syncToggleStates(msg.payload);
      } else if (msg.type === 'turbo-stream') {
        turboStreamLog.push(msg.payload);
        if (getActiveTab() === 'turbo') {
          renderTurboStreams();
        }
      }
    });

    port.onDisconnect.addListener(() => {
      port = null;
      setTimeout(connect, 1000);
    });
  }

  connect();

  // --- Tabs ---

  function getActiveTab() {
    return document.querySelector('.tab.active')?.dataset.tab || 'metrics';
  }

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.panel-content').forEach((p) => p.classList.add('hidden'));
      const panel = document.querySelector(`.panel-content[data-tab="${tab.dataset.tab}"]`);
      if (panel) panel.classList.remove('hidden');
      renderActiveTab();
    });
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    if (port) {
      port.postMessage({ type: 'request-scan', tabId });
    }
  });

  // --- Controls (overlay toggles) ---

  document.querySelectorAll('.control-toggle input').forEach((input) => {
    input.addEventListener('change', () => {
      if (port) {
        port.postMessage({
          type: 'toggle-overlay',
          tabId,
          payload: { id: input.dataset.toggle, checked: input.checked }
        });
      }
    });
  });

  function renderActiveTab() {
    const tab = getActiveTab();
    if (tab === 'metrics') renderMetrics();
    else if (tab === 'templates') renderTemplates();
    else if (tab === 'stimulus') renderStimulus();
    else if (tab === 'turbo') {
      renderTurboIssues();
      renderTurboStreams();
    }
  }

  // --- Metrics ---

  function renderMetrics() {
    const panel = document.getElementById('metricsPanel');
    const m = currentData?.metrics;
    if (!m) {
      panel.innerHTML = '<div class="empty-state">No metrics data detected</div>';
      return;
    }

    const t = m.thresholds || {};
    let html = '<div class="metrics-grid">';
    html += metric('Duration', m.duration + 'ms', m.duration > (t.duration || 200));
    html += metric('Queries', m.queries + ' (' + m.query_time + 'ms)', m.queries > (t.queries || 20));
    html += metric('Renders', m.renders + ' (' + m.render_time + 'ms)', false);
    html += metric('GC alloc', m.gc_objects.toLocaleString() + ' obj', m.gc_objects > (t.gc_objects || 100000));
    html += '</div>';

    if (m.details?.queries?.length > 0) {
      html += '<details class="details-section"><summary>' + m.details.queries.length + ' queries</summary>';
      html += '<div class="details-list">';
      m.details.queries.forEach((q) => {
        html += `<div class="details-item"><span class="details-dur">${q.duration}ms</span><span class="details-name">${esc(q.name || 'SQL')}</span></div>`;
      });
      html += '</div></details>';
    }

    if (m.details?.renders?.length > 0) {
      html += '<details class="details-section"><summary>' + m.details.renders.length + ' renders</summary>';
      html += '<div class="details-list">';
      m.details.renders.forEach((r) => {
        const extra = [];
        if (r.queries > 0) extra.push(r.queries + 'q ' + r.query_time + 'ms');
        if (r.gc_objects > 0) extra.push(r.gc_objects.toLocaleString() + ' alloc');
        const suffix = extra.length ? ` <span class="details-extra">${extra.join(' | ')}</span>` : '';
        html += `<div class="details-item"><span class="details-dur">${r.duration}ms</span><span class="details-name">${esc(r.template)}${suffix}</span></div>`;
      });
      html += '</div></details>';
    }

    panel.innerHTML = html;
  }

  function metric(label, value, warn) {
    return `<div class="metric${warn ? ' warn' : ''}"><div class="metric-value">${value}</div><div class="metric-label">${label}</div></div>`;
  }

  // --- Templates ---

  let templateFilter = '';
  let templateTypeFilter = '';

  function renderTemplates() {
    const panel = document.getElementById('templatesPanel');
    const templates = currentData?.templates;
    if (!templates?.length) {
      panel.innerHTML = '<div class="empty-state">No template boundaries detected</div>';
      return;
    }

    const metrics = currentData?.metrics;
    const renderDetails = metrics?.details?.renders || [];

    // Collect types for filter
    const types = [...new Set(templates.map(t => t.outlineType || 'view'))].sort();

    let html = '<div class="filter-bar">';
    html += `<input type="text" class="filter-input" id="templateFilterInput" placeholder="Filter by name..." value="${esc(templateFilter)}">`;
    html += '<select class="filter-select" id="templateTypeFilter">';
    html += `<option value="">All types</option>`;
    types.forEach(t => {
      html += `<option value="${t}"${templateTypeFilter === t ? ' selected' : ''}>${t}</option>`;
    });
    html += '</select>';
    html += '</div>';

    // Filter
    const filtered = templates.filter(t => {
      const path = (t.relativePath || t.fileName || '').toLowerCase();
      const type = t.outlineType || 'view';
      const matchesName = !templateFilter || path.includes(templateFilter.toLowerCase());
      const matchesType = !templateTypeFilter || type === templateTypeFilter;
      return matchesName && matchesType;
    });

    html += `<div class="filter-count">${filtered.length} of ${templates.length}</div>`;
    html += '<ul class="template-list">';
    filtered.forEach((t) => {
      const info = { duration: 0, queries: 0, count: 0 };
      renderDetails.forEach((r) => {
        if (r.template === t.relativePath) {
          info.duration += r.duration;
          info.queries += r.queries || 0;
          info.count++;
        }
      });

      const type = t.outlineType || 'view';
      const metricsStr = info.count > 0
        ? `${info.duration < 0.1 ? '<0.1' : info.duration.toFixed(1)}ms${info.queries > 0 ? ' ' + info.queries + 'q' : ''}${info.count > 1 ? ' ' + info.count + 'x' : ''}`
        : '';

      html += `<li class="template-item" data-selector="${esc(t.selector)}">`;
      html += `<span class="template-badge ${type}">${type}</span>`;
      html += `<span class="template-path">${esc(t.relativePath || t.fileName)}</span>`;
      if (metricsStr) html += `<span class="template-metrics">${metricsStr}</span>`;
      html += '</li>';
    });
    html += '</ul>';
    panel.innerHTML = html;

    // Filter events
    const filterInput = document.getElementById('templateFilterInput');
    filterInput?.addEventListener('input', (e) => {
      templateFilter = e.target.value;
      const pos = e.target.selectionStart;
      renderTemplates();
      const restored = document.getElementById('templateFilterInput');
      if (restored) { restored.focus(); restored.setSelectionRange(pos, pos); }
    });
    document.getElementById('templateTypeFilter')?.addEventListener('change', (e) => {
      templateTypeFilter = e.target.value;
      renderTemplates();
    });

    // Hover highlight
    panel.querySelectorAll('.template-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        const selector = item.dataset.selector;
        if (port && selector) {
          port.postMessage({ type: 'highlight-element', tabId, payload: { selector } });
        }
      });
      item.addEventListener('mouseleave', () => {
        if (port) {
          port.postMessage({ type: 'unhighlight', tabId });
        }
      });
    });
  }

  // --- Stimulus ---

  let stimulusFilter = '';
  let stimulusView = 'all'; // 'all', 'registered', 'active', 'issues'

  function renderStimulus() {
    const panel = document.getElementById('stimulusPanel');
    const data = currentData?.stimulusData;

    if (!data) {
      panel.innerHTML = '<div class="empty-state">Waiting for Stimulus data...</div>';
      return;
    }

    if (!data.available) {
      panel.innerHTML = '<div class="info-message">Stimulus not found on window.Stimulus</div>';
      return;
    }

    const registered = data.registeredControllers || [];
    const active = data.activeControllers || [];
    const issues = data.issues || [];

    let html = '<div class="filter-bar">';
    html += `<input type="text" class="filter-input" id="stimulusFilterInput" placeholder="Filter controllers..." value="${esc(stimulusFilter)}">`;
    html += '<select class="filter-select" id="stimulusViewFilter">';
    html += `<option value="all"${stimulusView === 'all' ? ' selected' : ''}>All (${registered.length})</option>`;
    html += `<option value="active"${stimulusView === 'active' ? ' selected' : ''}>Active (${active.length})</option>`;
    html += `<option value="registered"${stimulusView === 'registered' ? ' selected' : ''}>Registered only (${registered.filter(c => !active.includes(c)).length})</option>`;
    if (issues.length > 0) {
      html += `<option value="issues"${stimulusView === 'issues' ? ' selected' : ''}>Issues (${issues.length})</option>`;
    }
    html += '</select>';
    html += '</div>';

    const filterLower = stimulusFilter.toLowerCase();

    if (stimulusView === 'issues') {
      const filtered = issues.filter(i => !filterLower || i.message.toLowerCase().includes(filterLower) || i.identifier.toLowerCase().includes(filterLower));
      html += `<div class="filter-count">${filtered.length} issue${filtered.length !== 1 ? 's' : ''}</div>`;
      html += '<ul class="issue-list">';
      filtered.forEach((issue) => {
        html += `<li class="issue-item" data-selector="${esc(issue.selector || '')}">`;
        html += `<span class="issue-badge ${issue.type}">${issue.type}</span>`;
        html += `<span class="issue-msg">${esc(issue.message)}</span>`;
        html += '</li>';
      });
      html += '</ul>';
    } else {
      let controllers;
      if (stimulusView === 'active') {
        controllers = active;
      } else if (stimulusView === 'registered') {
        controllers = registered.filter(c => !active.includes(c));
      } else {
        controllers = registered;
      }

      const filtered = controllers.filter(c => !filterLower || c.toLowerCase().includes(filterLower));
      html += `<div class="filter-count">${filtered.length} controller${filtered.length !== 1 ? 's' : ''}</div>`;
      html += '<ul class="controller-list">';
      filtered.forEach((name) => {
        const isActive = active.includes(name);
        const hasIssue = issues.some(i => i.identifier === name);
        html += `<li class="controller-item">`;
        html += `<span class="controller-status ${isActive ? 'active' : 'inactive'}">${isActive ? '\u25CF' : '\u25CB'}</span>`;
        html += `<span class="controller-name">${esc(name)}</span>`;
        if (hasIssue) html += `<span class="controller-warn">\u26A0</span>`;
        html += '</li>';
      });
      html += '</ul>';
    }

    panel.innerHTML = html;

    // Filter events
    document.getElementById('stimulusFilterInput')?.addEventListener('input', (e) => {
      stimulusFilter = e.target.value;
      const pos = e.target.selectionStart;
      renderStimulus();
      const restored = document.getElementById('stimulusFilterInput');
      if (restored) { restored.focus(); restored.setSelectionRange(pos, pos); }
    });
    document.getElementById('stimulusViewFilter')?.addEventListener('change', (e) => {
      stimulusView = e.target.value;
      renderStimulus();
    });

    // Hover highlight for issues
    panel.querySelectorAll('.issue-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        const selector = item.dataset.selector;
        if (port && selector) {
          port.postMessage({ type: 'highlight-element', tabId, payload: { selector } });
        }
      });
      item.addEventListener('mouseleave', () => {
        if (port) {
          port.postMessage({ type: 'unhighlight', tabId });
        }
      });
    });
  }

  // --- Turbo ---

  function renderTurboIssues() {
    const container = document.getElementById('turboIssues');
    const issues = currentData?.turboIssues;

    if (!issues?.length) {
      container.innerHTML = '<div class="ok-message">No issues found</div>';
      return;
    }

    let html = `<div class="count-label">${issues.length} issue${issues.length > 1 ? 's' : ''}</div>`;
    html += '<ul class="issue-list">';
    issues.forEach((issue) => {
      html += `<li class="issue-item" data-selector="${esc(issue.selector || '')}">`;
      html += `<span class="issue-badge ${issue.type}">${issue.type}</span>`;
      html += `<span class="issue-msg">${esc(issue.message)}</span>`;
      html += '</li>';
    });
    html += '</ul>';
    container.innerHTML = html;

    container.querySelectorAll('.issue-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        const selector = item.dataset.selector;
        if (port && selector) {
          port.postMessage({ type: 'highlight-element', tabId, payload: { selector } });
        }
      });
      item.addEventListener('mouseleave', () => {
        if (port) {
          port.postMessage({ type: 'unhighlight', tabId });
        }
      });
    });
  }

  function renderTurboStreams() {
    const container = document.getElementById('turboStreams');
    if (!turboStreamLog.length) {
      container.innerHTML = '<div class="empty-state">No streams captured</div>';
      return;
    }

    let html = '<ul class="stream-list">';
    turboStreamLog.forEach((s) => {
      html += '<li class="stream-item">';
      html += `<span class="stream-action ${s.action}">${esc(s.action)}</span>`;
      html += `<span class="stream-target">${esc(s.target)}</span>`;
      if (s.template) html += `<span class="stream-template">${esc(s.template)}</span>`;
      html += `<span class="stream-time">${esc(s.time)}</span>`;
      html += '</li>';
    });
    html += '</ul>';
    container.innerHTML = html;
  }

  // --- Helpers ---

  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function syncToggleStates(states) {
    if (!states) return;
    document.querySelectorAll('.control-toggle input').forEach((input) => {
      const id = input.dataset.toggle;
      if (id && id in states) {
        input.checked = states[id];
      }
    });
  }
})();
