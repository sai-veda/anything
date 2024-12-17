console.log('[ChatGPT Content] Script loaded');

// Observe ChatGPT conversation
const observer = new MutationObserver(mutations => {
  console.log('[ChatGPT Content] Mutations detected:', mutations.length);
  for (let mutation of mutations) {
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          console.log('[ChatGPT Content] New element node added:', node);
          // Try to find ChatGPT answer blocks
          const messageBlocks = node.querySelectorAll('.markdown');
          console.log('[ChatGPT Content] Found message blocks:', messageBlocks.length);
          
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

// Start observing the conversation
function startObserving() {
  console.log('[ChatGPT Content] Attempting to start observer');
  const targetNode = document.querySelector('#__next');
  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
    console.log('[ChatGPT Content] Observer started successfully');
  } else {
    console.log('[ChatGPT Content] Target node not found, retrying in 1s');
    setTimeout(startObserving, 1000);
  }
}

// Listen for request to insert a prompt
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[ChatGPT Content] Received message:', msg);
  if (msg.type === 'INSERT_PROMPT') {
    console.log('[ChatGPT Content] Attempting to insert test prompt');
    // Insert a test prompt into ChatGPT input and simulate Enter
    const inputSelector = 'textarea';
    const inputEl = document.querySelector(inputSelector);
    if (inputEl) {
      console.log('[ChatGPT Content] Found input element');
      // Example prompt asking ChatGPT to provide a JSON command list
      inputEl.value = `Please produce a JSON block with commands to open Google Docs at https://docs.google.com, create a new document, and type 'Hello' into it. The JSON should look like this:
{
  "commands": [
    {"action":"GO_TO", "url":"https://docs.google.com"},
    {"action":"WAIT", "selector":".docs-title-input"},
    {"action":"TYPE", "selector":".kix-lineview", "text":"Hello"}
  ]
}`;
      
      inputEl.dispatchEvent(new Event('input', {bubbles: true}));
      console.log('[ChatGPT Content] Dispatched input event');
      
      // Try to submit the form
      const form = inputEl.closest('form');
      if (form) {
        console.log('[ChatGPT Content] Found form, submitting');
        form.dispatchEvent(new Event('submit', {bubbles: true}));
      } else {
        console.log('[ChatGPT Content] No form found, simulating Enter key');
        // Fallback to Enter key simulation
        const enterEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter'
        });
        inputEl.dispatchEvent(enterEvent);
      }
    } else {
      console.warn('[ChatGPT Content] Could not find input element');
    }
  }
});

startObserving(); 