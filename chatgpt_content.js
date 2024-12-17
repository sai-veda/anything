console.log('[ChatGPT Content] Script loaded');

// Notify background script that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });

// Keep track of ready state
let isReady = false;

const observer = new MutationObserver(mutations => {
  console.log('[ChatGPT Content] Mutations detected:', mutations.length);
  for (let mutation of mutations) {
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          console.log('[ChatGPT Content] New element node added:', node);

          // Try to find ChatGPT answer blocks
          const messageBlocks = node.querySelectorAll('.markdown');
          if (messageBlocks.length > 0) {
            console.log('[ChatGPT Content] Found message blocks:', messageBlocks.length);
          }

          messageBlocks.forEach(block => {
            const text = block.innerText;
            console.log('[ChatGPT Content] Processing message block:', text);
            // Try to parse JSON block from the end
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              console.log('[ChatGPT Content] Found JSON match:', jsonMatch[0]);
              try {
                const obj = JSON.parse(jsonMatch[0]);
                if (obj.commands) {
                  console.log('[ChatGPT Content] Found valid commands:', obj.commands);
                  chrome.runtime.sendMessage({
                    type: 'COMMANDS',
                    commands: obj.commands
                  });
                } else {
                  console.log('[ChatGPT Content] JSON object does not contain commands');
                }
              } catch(e) {
                console.warn('[ChatGPT Content] JSON parse error:', e);
              }
            } else {
              console.log('[ChatGPT Content] No JSON block found in message');
            }
          });
        }
      });
    }
  }
});

// Start observing document.body immediately
console.log('[ChatGPT Content] Starting observer on document.body');
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Listen for request to insert a prompt
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[ChatGPT Content] Received message:', msg);
  
  // Always send a response to confirm message was received
  sendResponse({ received: true });
  
  if (msg.type === 'INSERT_PROMPT') {
    console.log('[ChatGPT Content] Attempting to insert test prompt');
    
    const inputSelector = '#prompt-textarea';
    const inputEl = document.querySelector(inputSelector);
    
    if (inputEl) {
      console.log('[ChatGPT Content] Found input element');
      
      // Set the prompt text
      const promptText = `Please produce a JSON block with commands to open Google Docs at https://docs.google.com, create a new document, and type 'Hello' into it. The JSON should look like this:
{
  "commands": [
    {"action":"GO_TO", "url":"https://docs.google.com"},
    {"action":"WAIT", "selector":".docs-title-input"},
    {"action":"TYPE", "selector":".kix-lineview", "text":"Hello"}
  ]
}`;

      // Set the value and innerHTML (some versions of ChatGPT use one or the other)
      inputEl.value = promptText;
      inputEl.innerHTML = promptText;
      
      // Dispatch input event to notify the app of changes
      inputEl.dispatchEvent(new Event('input', {bubbles: true}));
      console.log('[ChatGPT Content] Dispatched input event');

      // Try multiple submission approaches in sequence
      
      // 1. Try to find and click the send button first
      const sendButton = document.querySelector('button[aria-label="Send message"]');
      if (sendButton) {
        console.log('[ChatGPT Content] Found send button, clicking it');
        sendButton.click();
        return;
      }
      
      // 2. Try form submission if available
      const form = inputEl.closest('form');
      if (form) {
        console.log('[ChatGPT Content] Found form, submitting');
        form.dispatchEvent(new Event('submit', {bubbles: true}));
        return;
      }
      
      // 3. Fallback to simulating Enter key with more complete event properties
      console.log('[ChatGPT Content] Trying Enter key simulation');
      const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        composed: true
      });
      
      inputEl.dispatchEvent(enterEvent);
      
      // Also try keypress and keyup for completeness
      const keypressEvent = new KeyboardEvent('keypress', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        composed: true
      });
      
      const keyupEvent = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        composed: true
      });
      
      inputEl.dispatchEvent(keypressEvent);
      inputEl.dispatchEvent(keyupEvent);
      
    } else {
      console.warn('[ChatGPT Content] Could not find input element');
    }
  }
}); 