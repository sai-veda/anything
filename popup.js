document.getElementById('startBtn').addEventListener('click', () => {
  console.log('[Popup] Start button clicked');
  chrome.runtime.sendMessage({type: 'CONTROL', action: 'START'});
  logMessage('Starting automation...');
});

document.getElementById('stopBtn').addEventListener('click', () => {
  console.log('[Popup] Stop button clicked');
  chrome.runtime.sendMessage({type: 'CONTROL', action: 'STOP'});
  logMessage('Stopping automation...');
});

// Listen for logs from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[Popup] Received message:', msg);
  if (msg.type === 'LOG') {
    logMessage(msg.message);
  }
});

function logMessage(message) {
  console.log('[Popup] Logging message:', message);
  const logDiv = document.getElementById('log');
  const timestamp = new Date().toLocaleTimeString();
  logDiv.textContent += `[${timestamp}] ${message}\n`;
  logDiv.scrollTop = logDiv.scrollHeight;
} 