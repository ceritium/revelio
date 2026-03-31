// Content script: reads DOM data and bridges page-script <-> background
(function () {
  let port = null;
  let revelioDetected = false;
  let stimulusData = null;
  let scanDebounceTimer = null;

  function detectRevelio() {
    return !!(
      document.getElementById('revelio-metrics') ||
      document.querySelector('[data-revelio-file]') ||
      document.querySelector('meta[name="revelio-project-path"]')
    );
  }

  function extractMetrics() {
    const el = document.getElementById('revelio-metrics');
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch {
      return null;
    }
  }

  function extractTemplates() {
    const templates = [];
    // Revelio uses comment markers AND data-revelio-* attributes on elements
    document.querySelectorAll('[data-revelio-file]').forEach((el) => {
      const file = el.getAttribute('data-revelio-file') || '';
      const type = el.getAttribute('data-revelio-type') || 'view';
      templates.push({
        outlineType: type,
        fileName: file.split('/').pop() || '',
        relativePath: file,
        fullPath: file,
        selector: uniqueSelector(el)
      });
    });
    return templates;
  }

  function scanTurboIssues() {
    const issues = [];

    document.querySelectorAll('turbo-frame').forEach((el) => {
      if (!el.id) {
        issues.push({
          type: 'frame',
          message: '<turbo-frame> missing required "id" attribute',
          selector: uniqueSelector(el)
        });
      }
    });

    document.querySelectorAll('[data-turbo-frame]').forEach((el) => {
      const frameId = el.getAttribute('data-turbo-frame');
      if (!frameId || frameId === '_top') return;
      const target = document.getElementById(frameId);
      if (!target || target.tagName.toLowerCase() !== 'turbo-frame') {
        issues.push({
          type: 'reference',
          message: `data-turbo-frame="${frameId}" points to non-existent frame`,
          selector: uniqueSelector(el)
        });
      }
    });

    return issues;
  }

  function uniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    const parts = [];
    let current = el;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`#${current.id}`);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current.tagName
        );
        if (siblings.length > 1) {
          selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function sendPageData() {
    if (!port) return;
    port.postMessage({
      type: 'page-data',
      payload: {
        metrics: extractMetrics(),
        templates: extractTemplates(),
        turboIssues: scanTurboIssues(),
        stimulusData: stimulusData
      }
    });
  }

  function scheduleScan() {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
      scanDebounceTimer = null;
      window.dispatchEvent(new CustomEvent('__revelio_devtools_request__'));
      sendPageData();
      sendToggleStates();
    }, 300);
  }

  function connect() {
    if (port) return;
    port = chrome.runtime.connect({ name: 'revelio-content' });

    port.onMessage.addListener((msg) => {
      if (msg.type === 'request-scan') {
        scheduleScan();
        sendToggleStates();
      } else if (msg.type === 'highlight-element') {
        highlightElement(msg.payload?.selector);
      } else if (msg.type === 'unhighlight') {
        unhighlightAll();
      } else if (msg.type === 'toggle-overlay') {
        toggleOverlayCheckbox(msg.payload?.id, msg.payload?.checked);
      }
    });

    port.onDisconnect.addListener(() => {
      port = null;
    });
  }

  // Toggle overlay checkboxes in Revelio's floating menu
  function toggleOverlayCheckbox(id, checked) {
    if (!id) return;
    const checkbox = document.getElementById(id);
    if (checkbox && checkbox.checked !== checked) {
      checkbox.checked = checked;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function sendToggleStates() {
    if (!port) return;
    const toggleIds = [
      'revelioToggleViewOutlines',
      'revelioTogglePartialOutlines',
      'revelioToggleComponentOutlines',
      'revelioToggleTooltips',
      'revelioToggleStimulusLinter',
      'revelioToggleTurboLinter',
      'revelioToggleComponentLinter'
    ];
    const states = {};
    toggleIds.forEach((id) => {
      const el = document.getElementById(id);
      states[id] = el ? el.checked : false;
    });
    port.postMessage({ type: 'toggle-states', payload: states });
  }

  // Highlight element in page
  let highlightOverlay = null;
  const ownNodes = new WeakSet();

  function highlightElement(selector) {
    unhighlightAll();
    if (!selector) return;
    try {
      const el = document.querySelector(selector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      highlightOverlay = document.createElement('div');
      highlightOverlay.setAttribute('data-revelio-ext-highlight', '');
      highlightOverlay.style.cssText = [
        'position:fixed',
        `top:${rect.top}px`,
        `left:${rect.left}px`,
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        'background:rgba(59,130,246,0.15)',
        'border:2px solid #3b82f6',
        'pointer-events:none',
        'z-index:2147483647',
        'transition:all 0.15s ease'
      ].join(';');
      ownNodes.add(highlightOverlay);
      document.body.appendChild(highlightOverlay);
    } catch {}
  }

  function unhighlightAll() {
    if (highlightOverlay) {
      highlightOverlay.remove();
      highlightOverlay = null;
    }
  }

  // Listen for data from page-script
  window.addEventListener('__revelio_devtools__', (e) => {
    const { type, payload } = e.detail;
    if (type === 'stimulus-data') {
      stimulusData = payload;
      sendPageData();
    } else if (type === 'turbo-stream') {
      if (port) {
        port.postMessage({ type: 'turbo-stream', payload });
      }
    }
  });

  // Inject page-script into main world
  function injectPageScript() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('page-script.js');
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => script.remove();
    }
  }

  // Turbo navigation support
  document.addEventListener('turbo:load', scheduleScan);
  document.addEventListener('turbo:render', scheduleScan);

  // MutationObserver for dynamic content
  const observer = new MutationObserver((mutations) => {
    if (!revelioDetected) {
      if (detectRevelio()) {
        revelioDetected = true;
        connect();
        injectPageScript();
        scheduleScan();
      }
      return;
    }

    const dominated = mutations.every((m) => {
      if (m.type === 'childList') {
        let allOwn = true;
        m.addedNodes.forEach((n) => {
          if (ownNodes.has(n) || (n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-revelio-ext-highlight'))) return;
          allOwn = false;
        });
        m.removedNodes.forEach((n) => {
          if (ownNodes.has(n) || (n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-revelio-ext-highlight'))) return;
          allOwn = false;
        });
        return allOwn;
      }
      return false;
    });
    if (!dominated) scheduleScan();
  });

  // Init
  if (detectRevelio()) {
    revelioDetected = true;
    connect();
    injectPageScript();
    scheduleScan();
  }

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
