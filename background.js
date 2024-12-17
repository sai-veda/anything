let isRunning = false;
let lastTargetTabId = null;

console.log('[Background] Script initialized');

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log('[Background] Received message:', msg, 'from sender:', sender);
  
  if (msg.type === 'CONTROL') {
    if (msg.action === 'START') {
      isRunning = true;
      console.log('[Background] Automation started, isRunning:', isRunning);
      log("Automation started.");
      
      chrome.tabs.query({url: "*://chat.openai.com/*"}, (tabs) => {
        if (tabs.length > 0) {
          console.log('[Background] Found ChatGPT tab, sending INSERT_PROMPT');
          chrome.tabs.sendMessage(tabs[0].id, {type: 'INSERT_PROMPT'});
        } else {
          console.log('[Background] No ChatGPT tab found');
          log("No ChatGPT tab found. Please open chat.openai.com and log in.");
        }
      });
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