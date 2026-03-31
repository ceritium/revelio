// Port relay: bridges content script <-> devtools panel messaging
const connections = new Map(); // tabId -> { content: Port | null, panel: Port | null }

function getConnection(tabId) {
  if (!connections.has(tabId)) {
    connections.set(tabId, { content: null, panel: null });
  }
  return connections.get(tabId);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'revelio-content') {
    const tabId = port.sender?.tab?.id;
    if (!tabId) return;

    const conn = getConnection(tabId);
    conn.content = port;

    port.onMessage.addListener((msg) => {
      if (conn.panel) {
        conn.panel.postMessage(msg);
      }
    });

    port.onDisconnect.addListener(() => {
      conn.content = null;
      if (!conn.panel) connections.delete(tabId);
    });
  }

  if (port.name === 'revelio-panel') {
    port.onMessage.addListener((msg) => {
      if (msg.type === 'init') {
        const tabId = msg.tabId;
        const conn = getConnection(tabId);
        conn.panel = port;

        port.onDisconnect.addListener(() => {
          conn.panel = null;
          if (!conn.content) connections.delete(tabId);
        });

        // Ask content script to send current data
        if (conn.content) {
          conn.content.postMessage({ type: 'request-scan' });
        }
      } else if (msg.tabId) {
        const conn = connections.get(msg.tabId);
        if (conn?.content) {
          conn.content.postMessage(msg);
        }
      }
    });
  }
});
