// Utility functions for the extension

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function generateId(prefix = 'id') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
}

function isElementVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    computedStyle.display !== 'none' &&
    computedStyle.visibility !== 'hidden' &&
    computedStyle.opacity !== '0'
  );
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

function simulateTyping(element, text, append = false) {
  // Focus the element first
  element.focus();

  // Enhanced text insertion that preserves formatting
  insertFormattedText(element, text, append);
}

async function insertFormattedText(element, text, append = false) {
  try {
    // Focus the element first
    element.focus();
    
    // Read existing content if appending
    let existingContent = '';
    if (append) {
      if (element.isContentEditable || element.contentEditable === 'true') {
        existingContent = element.textContent || element.innerText || '';
      } else {
        existingContent = element.value || '';
      }
      
      // Add appropriate separator if there's existing content
      if (existingContent.trim()) {
        // Add double newline to separate prompts clearly
        text = existingContent.trimEnd() + '\n\n' + text;
      }
    }
    
    // Clear existing content (we'll replace with combined content)
    if (element.isContentEditable || element.contentEditable === 'true') {
      element.innerHTML = '';
    } else {
      element.value = '';
    }
    
    // Method 1: Try clipboard-based paste - DISABLED by default due to UX concerns
    // (overwrites user's clipboard without permission)
    // const clipboardSuccess = await tryClipboardPaste(element, text);
    // if (clipboardSuccess) {
    //   console.log('Clipboard paste successful');
    //   return;
    // }
    
    // Method 2: Try execCommand insertText (more reliable than paste)
    const execInsertSuccess = await tryExecCommandInsert(element, text);
    if (execInsertSuccess) {
      console.log('ExecCommand insertText successful');
      return;
    }
    
    // Method 3: Enhanced manual insertion with better event simulation
    console.log('Falling back to enhanced manual insertion');
    await enhancedManualInsertion(element, text);
    
  } catch (error) {
    console.error('Error in insertFormattedText:', error);
    // Final fallback to basic text insertion
    fallbackTextInsertion(element, text);
  }
}

// Method 1: Use modern Clipboard API to simulate real paste
async function tryClipboardPaste(element, text) {
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return false;
    }
    
    // Write text to clipboard
    await navigator.clipboard.writeText(text);
    
    // Focus element and clear
    element.focus();
    
    // Simulate Ctrl+V keydown
    const ctrlVKeydown = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      metaKey: false
    });
    element.dispatchEvent(ctrlVKeydown);
    
    // Simulate paste event with actual clipboard data
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });
    
    // Add text to clipboard data
    pasteEvent.clipboardData.setData('text/plain', text);
    pasteEvent.clipboardData.setData('text/html', formatTextForContentEditable(text));
    
    const pasteResult = element.dispatchEvent(pasteEvent);
    
    // If paste event was handled, the text should be inserted
    // Wait a bit to see if it worked
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check if text was actually inserted
    const currentText = element.isContentEditable ? element.textContent : element.value;
    if (currentText.includes(text.substring(0, 20))) {
      triggerFinalEvents(element);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('Clipboard paste failed:', error);
    return false;
  }
}

// Method 2: Use execCommand insertText (more reliable than paste)
async function tryExecCommandInsert(element, text) {
  try {
    if (!document.execCommand) {
      return false;
    }
    
    // Focus the element
    element.focus();
    
    // For textarea and input elements, try setRangeText first
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      if (element.setRangeText) {
        element.setRangeText(text, 0, element.value.length, 'end');
        triggerFinalEvents(element);
        return true;
      }
    }
    
    // For contenteditable elements, select all content and use insertText
    if (element.isContentEditable || element.contentEditable === 'true') {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Try insertText command
      const insertSuccess = document.execCommand('insertText', false, text);
      if (insertSuccess) {
        triggerFinalEvents(element);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log('ExecCommand insertText failed:', error);
    return false;
  }
}

// Method 3: Enhanced manual insertion with typing simulation
async function enhancedManualInsertion(element, text) {
  // For contenteditable elements, preserve formatting and line breaks
  if (element.isContentEditable || element.contentEditable === 'true') {
    // Try character-by-character insertion to simulate typing
    await simulateTypingInsertion(element, text);
  } else {
    // For textarea and input elements, preserve line breaks as \n
    element.value = text;
    
    // Set cursor to end
    if (element.setSelectionRange) {
      element.setSelectionRange(text.length, text.length);
    }
  }
  
  triggerFinalEvents(element);
}

// Simulate character-by-character typing for contenteditable elements
async function simulateTypingInsertion(element, text) {
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Insert line character by character
    for (const char of line) {
      insertSingleCharacter(element, char);
      await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
    }
    
    // Add line break except for the last line
    if (i < lines.length - 1) {
      insertLineBreak(element);
    }
  }
}

// Insert a single character into contenteditable element
function insertSingleCharacter(element, char) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  
  const textNode = document.createTextNode(char);
  range.insertNode(textNode);
  
  // Move cursor after the inserted character
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Insert a line break into contenteditable element
function insertLineBreak(element) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  
  const br = document.createElement('br');
  range.insertNode(br);
  
  // Move cursor after the line break
  range.setStartAfter(br);
  range.setEndAfter(br);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Trigger events that frameworks expect
function triggerFinalEvents(element) {
  // Trigger comprehensive events in the right order
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  
  // Some frameworks listen for composition events
  element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
}

// Final fallback for basic text insertion
function fallbackTextInsertion(element, text) {
  if (element.isContentEditable || element.contentEditable === 'true') {
    element.innerHTML = formatTextForContentEditable(text);
    
    // Set cursor to end
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    element.value = text;
    if (element.setSelectionRange) {
      element.setSelectionRange(text.length, text.length);
    }
  }
  
  triggerFinalEvents(element);
}

function formatTextForContentEditable(text) {
  // Escape HTML to prevent injection while preserving intended formatting
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  
  // Convert line breaks to HTML breaks
  const escaped = escapeHtml(text);
  const withBreaks = escaped
    .replace(/\r\n/g, '<br>')  // Windows line endings
    .replace(/\n/g, '<br>')    // Unix line endings
    .replace(/\r/g, '<br>');   // Mac line endings
  
  // Preserve multiple spaces (important for code formatting)
  const withSpaces = withBreaks.replace(/  /g, ' &nbsp;');
  
  return withSpaces;
}

function showToast(message, type = 'info', duration = 3000) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `prompt-library-toast prompt-suite-toast prompt-library-toast-${type} prompt-suite-toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      ${type === 'success' ? '✓' : type === 'warning' ? '⚠' : type === 'error' ? '✗' : 'ℹ'}
    </div>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .prompt-library-toast, .prompt-suite-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      animation: slideIn 0.3s ease-out;
    }
    
    .prompt-library-toast-success, .prompt-suite-toast-success {
      background: rgba(34, 197, 94, 0.9);
      color: white;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    
    .prompt-library-toast-warning, .prompt-suite-toast-warning {
      background: rgba(251, 191, 36, 0.9);
      color: white;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }
    
    .prompt-library-toast-error, .prompt-suite-toast-error {
      background: rgba(239, 68, 68, 0.9);
      color: white;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .prompt-library-toast-info, .prompt-suite-toast-info {
      background: rgba(59, 130, 246, 0.9);
      color: white;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    
    .toast-icon {
      margin-right: 8px;
      font-weight: bold;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 300);
  }, duration);
}
