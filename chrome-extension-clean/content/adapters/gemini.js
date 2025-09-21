// Gemini adapter for prompt insertion and reading
window.promptLibraryAdapter = {
  name: 'Gemini',
  
  selectors: {
    composer: [
      'div[contenteditable="true"][data-test-id*="input"]',
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea[aria-label*="Message"]',
      '.input-area div[contenteditable]',
      'div[contenteditable="true"]:not([data-test-id*="message"])'
    ]
  },

  match(url) {
    return url.hostname === 'gemini.google.com';
  },

  findComposer() {
    for (const selector of this.selectors.composer) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (this.isVisible(element) && this.isEnabled(element)) {
          return element;
        }
      }
    }
    return null;
  },

  async insert(text) {
    const composer = this.findComposer();
    if (!composer) {
      console.warn('Gemini composer not found');
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
      console.error('Failed to insert text in Gemini:', error);
      return false;
    }
  },

  async readCurrentInput() {
    console.log('Gemini: Attempting to read current input...');
    
    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const composer = this.findComposer();
    if (!composer) {
      console.error('Gemini composer not found for reading');
      throw new Error('Gemini composer not found');
    }
    
    let text = '';
    if (composer.tagName === 'TEXTAREA') {
      text = composer.value || '';
    } else {
      text = composer.textContent || composer.innerText || '';
    }
    
    console.log('Gemini: Read text length:', text.length, 'Preview:', text.substring(0, 100));
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
    // Check for indicators that Gemini has finished responding
    // Look for stop button - if not visible, likely finished
    const stopButton = document.querySelector('button[aria-label*="Stop"]');
    if (!stopButton || !this.isVisible(stopButton)) {
      return true; // No stop button means not generating
    }

    return false; // Stop button visible means still generating
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
    
    // Trigger additional events for Gemini compatibility
    element.dispatchEvent(new Event('keydown', { bubbles: true }));
    element.dispatchEvent(new Event('keyup', { bubbles: true }));
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

// Add Prompt Suite alias for rebranding
window.promptSuiteAdapter = window.promptLibraryAdapter;

console.log('Gemini adapter loaded');
