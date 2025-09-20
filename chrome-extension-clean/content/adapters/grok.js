// Grok adapter for prompt insertion and reading
window.promptLibraryAdapter = {
  name: 'Grok',
  
  selectors: {
    composer: [
      // Grok text input selectors - will need refinement after testing
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

  match(url) {
    return url.hostname === 'grok.com' || url.hostname === 'x.ai';
  },

  findComposer() {
    console.log('Grok: Searching for composer element...');
    for (const selector of this.selectors.composer) {
      const elements = document.querySelectorAll(selector);
      console.log(`Grok: Selector "${selector}" found ${elements.length} elements`);
      for (const element of elements) {
        console.log(`Grok: Checking element:`, element, 'visible:', this.isVisible(element), 'enabled:', this.isEnabled(element));
        if (this.isVisible(element) && this.isEnabled(element)) {
          console.log('Grok: Found composer element:', element);
          return element;
        }
      }
    }
    console.warn('Grok: No composer element found');
    return null;
  },

  async insert(text) {
    const composer = this.findComposer();
    if (!composer) {
      console.warn('Grok composer not found');
      return false;
    }

    try {
      // Focus the composer
      composer.focus();
      
      if (composer.tagName === 'TEXTAREA') {
        // Handle textarea elements
        composer.value = text;
        composer.setSelectionRange(text.length, text.length);
      } else {
        // Handle contenteditable elements
        composer.textContent = text;
        
        // Set cursor to end
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(composer);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Trigger events
      this.triggerEvents(composer);
      
      // Scroll into view
      composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      return true;
    } catch (error) {
      console.error('Failed to insert text in Grok:', error);
      return false;
    }
  },

  async readCurrentInput() {
    console.log('Grok: Attempting to read current input...');
    
    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const composer = this.findComposer();
    if (!composer) {
      console.error('Grok composer not found for reading');
      throw new Error('Grok composer not found');
    }
    
    let text = '';
    if (composer.tagName === 'TEXTAREA') {
      text = composer.value || '';
    } else {
      text = composer.textContent || composer.innerText || '';
    }
    
    console.log('Grok: Read text length:', text.length, 'Preview:', text.substring(0, 100));
    return text;
  },

  submitPrompt() {
    // Find submit button
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
        if (this.isVisible(button) && !button.disabled) {
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
  },

  checkLLMStatus() {
    // Check for indicators that Grok has finished responding
    // Look for stop button or loading indicators
    const stopButton = document.querySelector('button[aria-label*="Stop"]');
    const loadingIndicator = document.querySelector('[class*="loading"]');
    const spinnerIndicator = document.querySelector('[class*="spinner"]');
    
    if ((!stopButton || !this.isVisible(stopButton)) && 
        (!loadingIndicator || !this.isVisible(loadingIndicator)) &&
        (!spinnerIndicator || !this.isVisible(spinnerIndicator))) {
      return true; // No stop/loading indicators means finished
    }

    return false; // Still generating
  },

  isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  },

  isEnabled(element) {
    return !element.disabled && !element.hasAttribute('aria-disabled');
  },

  triggerEvents(element) {
    // For textarea elements
    if (element.tagName === 'TEXTAREA') {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    } else {
      // For contenteditable elements
      element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Trigger focus for better compatibility
    element.dispatchEvent(new Event('focus', { bubbles: true }));
  }
};

// Message handling for prompt insertion
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ success: true });
    return;
  }
  
  if (message.type === 'INSERT_PROMPT' && window.promptLibraryAdapter) {
    window.promptLibraryAdapter.insert(message.text)
      .then(success => {
        sendResponse({ success });
      })
      .catch(error => {
        console.error('Failed to insert prompt:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  } else if (message.type === 'READ_CURRENT_INPUT' && window.promptLibraryAdapter) {
    try {
      const text = window.promptLibraryAdapter.readCurrentInput();
      sendResponse({ success: true, text: text || '' });
    } catch (error) {
      console.error('Failed to read current input:', error);
      sendResponse({ success: false, text: '', error: error.message });
    }
    return true; // Will respond asynchronously
  } else if (message.type === 'SUBMIT_PROMPT' && window.promptLibraryAdapter) {
    try {
      const success = window.promptLibraryAdapter.submitPrompt();
      sendResponse({ success });
    } catch (error) {
      console.error('Failed to submit prompt:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Will respond asynchronously
  } else if (message.type === 'CHECK_LLM_STATUS' && window.promptLibraryAdapter) {
    try {
      const completed = window.promptLibraryAdapter.checkLLMStatus();
      sendResponse({ success: true, completed });
    } catch (error) {
      console.error('Failed to check LLM status:', error);
      sendResponse({ success: false, completed: false, error: error.message });
    }
    return true; // Will respond asynchronously
  }
});

console.log('Grok adapter loaded');