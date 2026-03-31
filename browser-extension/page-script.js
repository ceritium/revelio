// Injected into the page's main world to access window.Stimulus and Turbo events
(function () {
  if (window.__revelioDevToolsPageScript) return;
  window.__revelioDevToolsPageScript = true;

  function getStimulusApp() {
    return window.Stimulus || null;
  }

  function getRegisteredControllers() {
    const app = getStimulusApp();
    if (!app?.router?.modules) return {};
    const map = {};
    app.router.modules.forEach((mod) => {
      map[mod.definition.identifier] = mod.definition.controllerConstructor;
    });
    return map;
  }

  function scanStimulus() {
    const app = getStimulusApp();
    if (!app) {
      return { available: false, issues: [] };
    }

    const controllers = getRegisteredControllers();
    const ids = Object.keys(controllers).sort();
    const issues = [];

    // Collect active controllers (those with instances in the DOM)
    const activeControllers = new Set();
    document.querySelectorAll('[data-controller]').forEach((el) => {
      const value = el.getAttribute('data-controller');
      if (value) {
        value.trim().split(/\s+/).forEach((name) => {
          if (name) activeControllers.add(name);
        });
      }
    });

    // Unregistered controllers
    document.querySelectorAll('[data-controller]').forEach((el) => {
      const value = el.getAttribute('data-controller');
      if (!value) return;
      value.trim().split(/\s+/).forEach((name) => {
        if (name && !controllers[name]) {
          issues.push({
            type: 'controller',
            identifier: name,
            message: `controller "${name}" is not registered`,
            selector: uniqueSelector(el)
          });
        }
      });
    });

    // Unknown targets
    ids.forEach((id) => {
      const klass = controllers[id];
      const validTargets = klass.targets || [];
      document.querySelectorAll(`[data-${id}-target]`).forEach((el) => {
        const targetName = el.getAttribute(`data-${id}-target`);
        if (targetName && !validTargets.includes(targetName)) {
          issues.push({
            type: 'target',
            identifier: id,
            message: `target "${targetName}" not in ${id}.targets`,
            selector: uniqueSelector(el)
          });
        }
      });
    });

    // Unknown actions
    const actionRegex = /(?:(\w[\w-]*)->)?(\w[\w-]*)#(\w+)/g;
    document.querySelectorAll('[data-action]').forEach((el) => {
      const value = el.getAttribute('data-action');
      if (!value) return;
      let match;
      actionRegex.lastIndex = 0;
      while ((match = actionRegex.exec(value)) !== null) {
        const id = match[2];
        const method = match[3];
        if (!controllers[id]) continue;
        const proto = controllers[id].prototype;
        if (typeof proto[method] !== 'function') {
          issues.push({
            type: 'action',
            identifier: id,
            message: `method "${method}" not found on ${id}`,
            selector: uniqueSelector(el)
          });
        }
      }
    });

    return {
      available: true,
      issues,
      controllerCount: ids.length,
      registeredControllers: ids,
      activeControllers: Array.from(activeControllers).sort()
    };
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

  // Turbo Stream tracking
  document.addEventListener('turbo:before-stream-render', (event) => {
    const target = event.target;
    if (!target || target.tagName !== 'TURBO-STREAM') return;

    const action = target.getAttribute('action') || 'unknown';
    const streamTarget =
      target.getAttribute('target') || target.getAttribute('targets') || '';
    const tpl = target.querySelector('template');
    let templateFile = '';
    if (tpl?.content) {
      const el = tpl.content.querySelector(
        '[data-revelio-file]'
      );
      if (el) {
        templateFile =
          el.getAttribute('data-revelio-file') || '';
      }
    }

    window.dispatchEvent(
      new CustomEvent('__revelio_devtools__', {
        detail: {
          type: 'turbo-stream',
          payload: {
            action,
            target: streamTarget,
            template: templateFile,
            time: new Date().toLocaleTimeString()
          }
        }
      })
    );
  });

  // Listen for scan requests from content script
  window.addEventListener('__revelio_devtools_request__', () => {
    const result = scanStimulus();
    window.dispatchEvent(
      new CustomEvent('__revelio_devtools__', {
        detail: { type: 'stimulus-data', payload: result }
      })
    );
  });

  // Initial scan after a short delay (wait for Stimulus to initialize)
  let retries = 0;
  function initialScan() {
    const result = scanStimulus();
    if (!result.available && retries < 20) {
      retries++;
      setTimeout(initialScan, 250);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('__revelio_devtools__', {
        detail: { type: 'stimulus-data', payload: result }
      })
    );
  }
  setTimeout(initialScan, 100);
})();
