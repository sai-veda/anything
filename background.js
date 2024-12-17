let isRunning = false;
let lastTargetTabId = null;
let contentScriptReady = false;

console.log('[Background] Script initialized');

// Track content script readiness
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log('[Background] Received message:', msg, 'from sender:', sender);
  
  if (msg.type === 'CONTENT_SCRIPT_READY') {
    console.log('[Background] Content script ready in tab:', sender.tab.id);
    contentScriptReady = true;
    sendResponse({ received: true });
    return;
  }
  
  if (msg.type === 'CONTROL') {
    if (msg.action === 'START') {
      isRunning = true;
      console.log('[Background] Automation started, isRunning:', isRunning);
      log("Automation started.");
      
      try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tabs || tabs.length === 0) {
          throw new Error('No active tab found');
        }
        
        const tabId = tabs[0].id;
        console.log('[Background] Found active tab:', tabId);
        
        // First inject the automation script
        console.log('[Background] Injecting automation script into tab:', tabId);
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['automation_content.js']
        });
        
        // Wait for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // First focus the input field
        await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_COMMAND',
          command: {
            action: 'CLICK',
            selector: '#prompt-textarea'
          }
        });
        
        // Wait a bit to simulate human behavior
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Type the text
        await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_COMMAND',
          command: {
            action: 'TYPE',
            text: 'hi',
            selector: '#prompt-textarea',
            simulateHuman: true
          }
        });
        
        // Wait a bit before clicking send button
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Click the send button
        await chrome.tabs.sendMessage(tabId, {
          type: 'EXECUTE_COMMAND',
          command: {
            action: 'CLICK',
            selector: 'button[data-testid="send-button"]'
          }
        });
        
        console.log('[Background] Message successfully sent');
      } catch (error) {
        console.error('[Background] Error:', error);
        log(error.message || "Could not interact with ChatGPT page. Please make sure you're on the ChatGPT page and try again.");
      }
    } else if (msg.action === 'STOP') {
      isRunning = false;
      console.log('[Background] Automation stopped, isRunning:', isRunning);
      log("Automation stopped.");
    }
  } else if (msg.type === 'COMMANDS' && isRunning) {
    console.log('[Background] Received commands from ChatGPT:', msg.commands);
    log("Received commands from ChatGPT.");
    const commands = msg.commands || [];
    await executeCommands(commands);
  } else if (msg.type === 'AUTOMATION_RESULT') {
    console.log('[Background] Received automation result:', msg.result);
    log("Result from automation content: " + msg.result);
  }
});

async function executeCommands(commands) {
  console.log('[Background] Executing commands:', commands);
  for (let cmd of commands) {
    if (!isRunning) {
      console.log('[Background] Stopping command execution as isRunning is false');
      break;
    }
    
    try {
      switch (cmd.action) {
        case 'GO_TO':
          console.log('[Background] Executing GO_TO command:', cmd.url);
          log("Opening URL: " + cmd.url);
          const tab = await openTab(cmd.url);
          lastTargetTabId = tab.id;
          await waitForTabLoad(tab.id);
          await injectAutomationScript(tab.id);
          break;
          
        case 'CLICK':
        case 'TYPE':
        case 'WAIT':
          if (lastTargetTabId) {
            console.log('[Background] Executing', cmd.action, 'command in tab:', lastTargetTabId);
            await executeInTab(lastTargetTabId, cmd);
          } else {
            console.log('[Background] No target tab set yet. Skipping:', cmd.action);
            log("No target tab set yet. Skipping: " + cmd.action);
          }
          break;
          
        default:
          console.log('[Background] Unknown command:', cmd.action);
          log("Unknown command: " + cmd.action);
      }
    } catch (error) {
      console.error('[Background] Error executing command:', error);
      log("Error executing command: " + error.message);
    }
  }
}

function openTab(url) {
  console.log('[Background] Opening new tab with URL:', url);
  return new Promise((resolve) => {
    chrome.tabs.create({url}, (tab) => {
      resolve(tab);
    });
  });
}

function waitForTabLoad(tabId) {
  console.log('[Background] Waiting for tab to load:', tabId);
  return new Promise((resolve) => {
    function check() {
      chrome.tabs.get(tabId, (tab) => {
        if (!tab) {
          console.log('[Background] Tab not found:', tabId);
          resolve();
        }
        else if (tab.status === 'complete') {
          console.log('[Background] Tab loaded:', tabId);
          resolve();
        }
        else {
          console.log('[Background] Tab still loading:', tabId);
          setTimeout(check, 500);
        }
      });
    }
    check();
  });
}

function executeInTab(tabId, command) {
  console.log('[Background] Executing in tab:', tabId, 'command:', command);
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_COMMAND',
      command
    }, (res) => {
      console.log('[Background] Command execution response:', res);
      resolve();
    });
  });
}

function injectAutomationScript(tabId) {
  console.log('[Background] Injecting automation script into tab:', tabId);
  return chrome.scripting.executeScript({
    target: { tabId },
    files: ['automation_content.js']
  });
}

function log(message) {
  console.log('[Background] Logging message:', message);
  chrome.runtime.sendMessage({ type: 'LOG', message });
} 