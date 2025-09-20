// Prevent multiple script injections
if (window.promptLibraryContentScriptLoaded) {
  // Skip duplicate initialization
} else {
  window.promptLibraryContentScriptLoaded = true;

// Main content script with integrated adapters for LLM platforms

// Helper functions
function isVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && 
         rect.height > 0 && 
         style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0';
}

function isEnabled(element) {
  if (!element) return false;
  return !element.disabled && 
         !element.readOnly && 
         element.getAttribute('contenteditable') !== 'false';
}

function triggerEvents(element) {
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(changeEvent);
}

// Define adapters for each platform (use window.promptLibraryAdapters to avoid redeclaration)
window.promptLibraryAdapters = {
  chatgpt: {
    name: 'ChatGPT',
    selectors: {
      composer: [
        'div[contenteditable="true"][data-id*="root"]',
        '#prompt-textarea',
        'textarea[data-id*="prompt"]',
        'div[contenteditable="true"][data-id*="prompt"]', 
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Send a message"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]:not([data-id*="message"])',
        'textarea:not([readonly]):not([disabled])',
        '.composer textarea',
        '[data-testid="composer-text-input"]',
        '[data-testid="message-input"]'
      ]
    },
    
    findComposer() {
      for (const selector of this.selectors.composer) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (isVisible(element) && isEnabled(element)) {
            return element;
          }
        }
      }
      return null;
    },
    
    async insert(text) {
      const composer = this.findComposer();
      if (!composer) {
        return false;
      }
      
      try {
        composer.focus();
        
        if (composer.tagName === 'TEXTAREA') {
          composer.value = text;
          composer.setSelectionRange(text.length, text.length);
        } else {
          composer.textContent = text;
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(composer);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        triggerEvents(composer);
        composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      } catch (error) {
        return false;
      }
    },
    
    async readCurrentInput() {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const composer = this.findComposer();
      if (!composer) {
        throw new Error('ChatGPT composer not found');
      }
      
      let text = '';
      if (composer.tagName === 'TEXTAREA') {
        text = composer.value || '';
      } else {
        text = composer.textContent || composer.innerText || '';
      }
      
      return text;
    },
    
    submitPrompt() {
      // Find submit button
      const submitSelectors = [
        '[data-testid="send-button"]',
        'button[aria-label*="Send"]',
        'button[type="submit"]:not([disabled])',
        '.btn-primary[type="submit"]',
        'button:has(svg)',
        'button[aria-describedby*="send"]'
      ];

      for (const selector of submitSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          if (isVisible(button) && !button.disabled) {
            button.click();
            return true;
          }
        }
      }

      // Fallback: try Enter key on composer
      const composer = this.findComposer();
      if (composer) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        composer.dispatchEvent(enterEvent);
        return true;
      }

      return false;
    }
  },
  
  claude: {
    name: 'Claude',
    selectors: {
      composer: [
        'div[contenteditable="true"][data-testid*="composer"]',
        'div[contenteditable="true"]:not([data-testid*="message"])',
        '.composer textarea',
        '[data-test="composer"] div[contenteditable]',
        'div[role="textbox"][contenteditable="true"]'
      ]
    },
    
    findComposer() {
      for (const selector of this.selectors.composer) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (isVisible(element) && isEnabled(element)) {
            return element;
          }
        }
      }
      return null;
    },
    
    async insert(text) {
      const composer = this.findComposer();
      if (!composer) return false;
      
      try {
        composer.focus();
        composer.textContent = text;
        triggerEvents(composer);
        composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      } catch (error) {
        console.error('Failed to insert text in Claude:', error);
        return false;
      }
    },
    
    async readCurrentInput() {
      console.log('Claude: Attempting to read current input...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const composer = this.findComposer();
      if (!composer) {
        throw new Error('Claude composer not found');
      }
      
      const text = composer.textContent || composer.innerText || '';
      console.log('Claude: Read text length:', text.length);
      return text;
    },
    
    submitPrompt() {
      // Find submit button
      const submitSelectors = [
        'button[aria-label*="Send"]',
        'button[type="submit"]:not([disabled])',
        'button:has(svg)',
        'button.send-button',
        '.send-btn'
      ];

      for (const selector of submitSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          if (isVisible(button) && !button.disabled) {
            button.click();
            return true;
          }
        }
      }

      // Fallback: try Enter key on composer
      const composer = this.findComposer();
      if (composer) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        composer.dispatchEvent(enterEvent);
        return true;
      }

      return false;
    }
  },
  
  gemini: {
    name: 'Gemini',
    selectors: {
      composer: [
        '.ql-editor:not([data-placeholder*="Follow-up"])',
        'div[contenteditable="true"][aria-label*="Message"]',
        'textarea[aria-label*="Message"]',
        '.input-area textarea',
        'rich-textarea .ql-editor'
      ]
    },
    
    findComposer() {
      for (const selector of this.selectors.composer) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (isVisible(element) && isEnabled(element)) {
            return element;
          }
        }
      }
      return null;
    },
    
    async insert(text) {
      const composer = this.findComposer();
      if (!composer) return false;
      
      try {
        composer.focus();
        
        if (composer.tagName === 'TEXTAREA') {
          composer.value = text;
          composer.setSelectionRange(text.length, text.length);
        } else {
          composer.textContent = text;
        }
        
        triggerEvents(composer);
        composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      } catch (error) {
        console.error('Failed to insert text in Gemini:', error);
        return false;
      }
    },
    
    async readCurrentInput() {
      console.log('Gemini: Attempting to read current input...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const composer = this.findComposer();
      if (!composer) {
        throw new Error('Gemini composer not found');
      }
      
      let text = '';
      if (composer.tagName === 'TEXTAREA') {
        text = composer.value || '';
      } else {
        text = composer.textContent || composer.innerText || '';
      }
      
      console.log('Gemini: Read text length:', text.length);
      return text;
    },
    
    submitPrompt() {
      // Find submit button
      const submitSelectors = [
        'button[aria-label*="Send"]',
        'button[type="submit"]:not([disabled])',
        'button:has(svg)',
        'button.send-button',
        '.send-btn',
        '[data-testid*="send"]'
      ];

      for (const selector of submitSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          if (isVisible(button) && !button.disabled) {
            button.click();
            return true;
          }
        }
      }

      // Fallback: try Enter key on composer
      const composer = this.findComposer();
      if (composer) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        composer.dispatchEvent(enterEvent);
        return true;
      }

      return false;
    }
  },
  
  perplexity: {
    name: 'Perplexity',
    selectors: {
      composer: [
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Search"]',
        'textarea[name="query"]',
        '.search-bar textarea',
        'div[contenteditable="true"][role="textbox"]'
      ]
    },
    
    findComposer() {
      for (const selector of this.selectors.composer) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (isVisible(element) && isEnabled(element)) {
            return element;
          }
        }
      }
      return null;
    },
    
    async insert(text) {
      const composer = this.findComposer();
      if (!composer) return false;
      
      try {
        composer.focus();
        
        if (composer.tagName === 'TEXTAREA') {
          composer.value = text;
          composer.setSelectionRange(text.length, text.length);
        } else {
          composer.textContent = text;
        }
        
        triggerEvents(composer);
        composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      } catch (error) {
        console.error('Failed to insert text in Perplexity:', error);
        return false;
      }
    },
    
    async readCurrentInput() {
      console.log('Perplexity: Attempting to read current input...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const composer = this.findComposer();
      if (!composer) {
        throw new Error('Perplexity composer not found');
      }
      
      let text = '';
      if (composer.tagName === 'TEXTAREA') {
        text = composer.value || '';
      } else {
        text = composer.textContent || composer.innerText || '';
      }
      
      console.log('Perplexity: Read text length:', text.length);
      return text;
    },
    
    submitPrompt() {
      // Find submit button
      const submitSelectors = [
        'button[aria-label*="Search"]',
        'button[aria-label*="Submit"]',
        'button[type="submit"]:not([disabled])',
        'button:has(svg)',
        'button.send-button',
        '.send-btn',
        '[data-testid*="submit"]'
      ];

      for (const selector of submitSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          if (isVisible(button) && !button.disabled) {
            button.click();
            return true;
          }
        }
      }

      // Fallback: try Enter key on composer
      const composer = this.findComposer();
      if (composer) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        composer.dispatchEvent(enterEvent);
        return true;
      }

      return false;
    }
  },
  
  grok: {
    name: 'Grok',
    selectors: {
      composer: [
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea[aria-label*="Message"]',
        'textarea[aria-label*="Chat"]',
        '.input-container textarea',
        'div[contenteditable="true"]:not([data-message])',
        'textarea:not([readonly]):not([disabled])',
        '[data-testid*="input"]',
        '[data-testid*="message"]'
      ]
    },
    
    findComposer() {
      for (const selector of this.selectors.composer) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (isVisible(element) && isEnabled(element)) {
            return element;
          }
        }
      }
      return null;
    },
    
    async insert(text) {
      const composer = this.findComposer();
      if (!composer) return false;
      
      try {
        composer.focus();
        
        if (composer.tagName === 'TEXTAREA') {
          composer.value = text;
          composer.setSelectionRange(text.length, text.length);
        } else {
          composer.textContent = text;
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(composer);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        triggerEvents(composer);
        composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      } catch (error) {
        console.error('Failed to insert text in Grok:', error);
        return false;
      }
    },
    
    async readCurrentInput() {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const composer = this.findComposer();
      if (!composer) {
        throw new Error('Grok composer not found');
      }
      
      let text = '';
      if (composer.tagName === 'TEXTAREA') {
        text = composer.value || '';
      } else {
        text = composer.textContent || composer.innerText || '';
      }
      
      return text;
    },
    
    submitPrompt() {
      const submitSelectors = [
        'button[aria-label*="Send"]',
        'button[aria-label*="Submit"]',
        'button[type="submit"]:not([disabled])',
        'button:has(svg)',
        'button.send-button',
        '.send-btn',
        '[data-testid*="send"]',
        '[data-testid*="submit"]'
      ];

      for (const selector of submitSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          if (isVisible(button) && !button.disabled) {
            button.click();
            return true;
          }
        }
      }

      const composer = this.findComposer();
      if (composer) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        composer.dispatchEvent(enterEvent);
        return true;
      }

      return false;
    }
  }
};

// Get the appropriate adapter for the current site
function getAdapter() {
  const hostname = window.location.hostname;
  
  if (hostname === 'claude.ai') {
    return window.promptLibraryAdapters.claude;
  } else if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') {
    return window.promptLibraryAdapters.chatgpt;
  } else if (hostname === 'gemini.google.com') {
    return window.promptLibraryAdapters.gemini;
  } else if (hostname === 'www.perplexity.ai' || hostname === 'perplexity.ai') {
    return window.promptLibraryAdapters.perplexity;
  } else if (hostname === 'grok.com' || hostname === 'x.ai') {
    return window.promptLibraryAdapters.grok;
  }
  
  return null;
}

// Message listener for background script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle ping for connection testing
  if (message.type === 'PING') {
    sendResponse({ success: true, adapter: getAdapter()?.name || 'None' });
    return;
  }
  
  const adapter = getAdapter();
  
  if (!adapter) {
    sendResponse({ success: false, error: 'No adapter available for this platform' });
    return;
  }
  
  switch (message.type) {
    case 'INSERT_PROMPT':
      adapter.insert(message.text)
        .then(success => {
          sendResponse({ success });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response
      
    case 'READ_CURRENT_INPUT':
      adapter.readCurrentInput()
        .then(text => {
          sendResponse({ success: true, text: text || '' });
        })
        .catch(error => {
          sendResponse({ success: false, text: '', error: error.message });
        });
      return true; // Keep message channel open for async response
      
    case 'SUBMIT_PROMPT':
      if (adapter.submitPrompt) {
        try {
          const success = adapter.submitPrompt();
          sendResponse({ success });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Submit not supported' });
      }
      return true;
      
    case 'CHECK_LLM_STATUS':
      if (adapter.checkStatus) {
        adapter.checkStatus()
          .then(completed => {
            sendResponse({ success: true, completed });
          })
          .catch(error => {
            sendResponse({ success: false, completed: false, error: error.message });
          });
      } else {
        sendResponse({ success: true, completed: false });
      }
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

  // Content script successfully loaded
}