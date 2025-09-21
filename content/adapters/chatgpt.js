// ChatGPT adapter for prompt insertion and reading
window.promptLibraryAdapter = {
  name: 'ChatGPT',
  
  selectors: {
    composer: [
      // Current ChatGPT selectors (updated 2024/2025)
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

  match(url) {
    return url.hostname === 'chatgpt.com';
  },

  findComposer() {
    console.log('ChatGPT: Searching for composer element...');
    for (const selector of this.selectors.composer) {
      const elements = document.querySelectorAll(selector);
      console.log(`ChatGPT: Selector "${selector}" found ${elements.length} elements`);
      for (const element of elements) {
        console.log(`ChatGPT: Checking element:`, element, 'visible:', this.isVisible(element), 'enabled:', this.isEnabled(element));
        if (this.isVisible(element) && this.isEnabled(element)) {
          console.log('ChatGPT: Found composer element:', element);
          return element;
        }
      }
    }
    console.warn('ChatGPT: No composer element found');
    return null;
  },

  async insert(text) {
    const composer = this.findComposer();
    if (!composer) {
      console.warn('ChatGPT composer not found');
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
      console.error('Failed to insert text in ChatGPT:', error);
      return false;
    }
  },

  async readCurrentInput() {
    console.log('ChatGPT: Attempting to read current input...');
    
    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const composer = this.findComposer();
    if (!composer) {
      console.error('ChatGPT composer not found for reading');
      throw new Error('ChatGPT composer not found');
    }
    
    let text = '';
    
    // Try multiple methods to get user input text
    if (composer.tagName === 'TEXTAREA') {
      text = composer.value || '';
    } else {
      // For contenteditable elements, try multiple approaches
      text = composer.textContent || composer.innerText || '';
      
      // If empty, try to trigger focus and read again
      if (!text.trim()) {
        composer.focus();
        await new Promise(resolve => setTimeout(resolve, 100));
        text = composer.textContent || composer.innerText || '';
      }
      
      // Last resort: try to read from selection if user has selected text
      if (!text.trim()) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          text = selection.toString();
        }
      }
    }
    
    console.log('ChatGPT: Read text length:', text.length, 'Preview:', text.substring(0, 100));
    
    // If still empty, suggest manual input
    if (!text.trim()) {
      console.log('ChatGPT: No text found in input field - may need manual entry');
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
    // Check for indicators that ChatGPT has finished responding
    const indicators = [
      // Stop button is hidden (response finished)
      'button[aria-label*="Stop"]',
      // Regenerate button is visible
      'button[aria-label*="Regenerate"]',
      // Submit button is enabled again
      '[data-testid="send-button"]:not([disabled])'
    ];

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
    
    // Trigger focus events
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

// Add Prompt Suite alias for rebranding
window.promptSuiteAdapter = window.promptLibraryAdapter;

console.log('ChatGPT adapter loaded');
