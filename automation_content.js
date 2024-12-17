console.log('[Automation Content] Script loaded');

// Listen for commands from background script
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  console.log('[Automation Content] Received message:', msg);
  if (msg.type === 'EXECUTE_COMMAND') {
    executeCommand(msg.command).then(result => {
      console.log('[Automation Content] Command execution result:', result);
      chrome.runtime.sendMessage({
        type: 'AUTOMATION_RESULT',
        result
      });
      respond(result);
    });
    return true; // keep the message channel open for async respond
  }
});

async function executeCommand(cmd) {
  console.log('[Automation Content] Executing command:', cmd);
  try {
    switch (cmd.action) {
      case 'CLICK':
        {
          console.log('[Automation Content] Attempting to click:', cmd.selector);
          let el = document.querySelector(cmd.selector);
          if (!el) throw new Error("Element not found: " + cmd.selector);
          el.click();
          return 'OK';
        }
      case 'TYPE':
        {
          console.log('[Automation Content] Attempting to type:', cmd.text, 'into:', cmd.selector);
          let el = document.querySelector(cmd.selector);
          if (!el) throw new Error("Element not found: " + cmd.selector);
          // For a complex editor like Google Docs, we might need to simulate keystrokes
          el.innerText = cmd.text;
          el.dispatchEvent(new Event('input', {bubbles: true}));
          return 'OK';
        }
      case 'WAIT':
        {
          console.log('[Automation Content] Waiting for element:', cmd.selector);
          // Wait until element is found
          let maxWait = 10000;
          let start = Date.now();
          while(Date.now() - start < maxWait) {
            let el = document.querySelector(cmd.selector);
            if (el) {
              console.log('[Automation Content] Element found:', cmd.selector);
              return 'OK';
            }
            await new Promise(r => setTimeout(r, 500));
          }
          throw new Error("Timeout waiting for: " + cmd.selector);
        }
      default:
        console.log('[Automation Content] Unknown action:', cmd.action);
        return 'UNKNOWN_ACTION';
    }
  } catch (err) {
    console.error('[Automation Content] Error executing command:', err);
    return 'ERROR: ' + err.message;
  }
} 