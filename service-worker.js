// Service worker for Prompt Suite Extension

console.log('🔥 Prompt Suite Service Worker Loading...');

// Storage helper class
class Storage {
  async get(keys) {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('Storage get error:', error);
      return {};
    }
  }
  
  async set(data) {
    try {
      return await chrome.storage.local.set(data);
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }
}

const storage = new Storage();

// Initialize storage
async function initializeStorage() {
  const data = await storage.get(['version']);
  if (!data.version) {
    console.log('🔧 Initializing storage for first time...');
    await storage.set({
      version: 1,
      folders: [
        { 
          id: 'fld_root', 
          name: 'Root', 
          parentId: null, 
          childFolderIds: [], 
          promptIds: [] 
        }
      ],
      prompts: {},
      recentPromptId: null,
      settings: {
        goToLLM: null,
        autoOpenPreferred: true
      },
      ui: {
        panelWidthByHost: { default: 360 }
      },
      scheduled: []
    });
    console.log('✅ Storage initialized');
  }
}

// Handle extension icon clicks - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🖱️ Extension icon clicked, opening side panel');
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// Handle internal messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔧 Message received:', message.type);
  
  (async () => {
    try {
      switch (message.type) {
        case 'GET_LIBRARY_DATA':
          console.log('📖 Getting library data from storage...');
          const data = await storage.get(['folders', 'prompts', 'recentPromptId', 'settings', 'scheduled', 'ui']);
          sendResponse({ success: true, data });
          break;
          
        case 'UPDATE_LIBRARY_DATA':
        case 'SAVE_LIBRARY_DATA':
          console.log('💾 Saving library data to storage...');
          await storage.set(message.data);
          console.log('✅ Data saved successfully');
          sendResponse({ success: true });
          break;
          
        case 'INSERT_PROMPT':
          console.log('🚀 Inserting prompt into chat window');
          await handlePromptInsertion(message, sendResponse);
          break;
          
        case 'READ_CURRENT_INPUT':
          console.log('📖 Reading current input from chat window');
          await handleReadCurrentInput(message, sendResponse);
          break;
          
        case 'SUBMIT_PROMPT':
          console.log('📤 Auto-submitting scheduled prompt');
          await handlePromptSubmission(message, sendResponse);
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep message channel open for async responses
});

// Handle external messages from prompt bridge
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('🌍 External message received:', message.type, 'from:', sender.origin);
  
  if (message.type === 'IMPORT_PROMPT') {
    handlePromptImport(message, sendResponse);
  } else {
    sendResponse({ success: true, message: 'Hello from Prompt Suite!' });
  }
  
  return true;
});

// Prompt insertion function
async function handlePromptInsertion(message, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    // Inject content script and insert prompt
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        if (window.promptLibraryAdapter && window.promptLibraryAdapter.insert) {
          return window.promptLibraryAdapter.insert(text);
        }
        return false;
      },
      args: [message.text]
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Error inserting prompt:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Read current input function
async function handleReadCurrentInput(message, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.promptLibraryAdapter && window.promptLibraryAdapter.readCurrentInput) {
          return window.promptLibraryAdapter.readCurrentInput();
        }
        return null;
      }
    });

    sendResponse({ success: true, text: result[0]?.result || '' });
  } catch (error) {
    console.error('Error reading current input:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Submit prompt function
async function handlePromptSubmission(message, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.promptLibraryAdapter && window.promptLibraryAdapter.submitPrompt) {
          return window.promptLibraryAdapter.submitPrompt();
        }
        return false;
      }
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Error submitting prompt:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle prompt import from external sources
async function handlePromptImport(message, sendResponse) {
  try {
    const data = await storage.get(['folders', 'prompts']);
    
    // Generate unique ID
    const promptId = 'pmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create new prompt
    const newPrompt = {
      id: promptId,
      title: message.title,
      body: message.body,
      folderId: message.folderId || 'fld_root',
      tags: message.tags || [],
      createdAt: new Date().toISOString()
    };
    
    // Add to prompts
    data.prompts[promptId] = newPrompt;
    
    // Ensure folders array exists
    if (!Array.isArray(data.folders)) data.folders = [];
    
    // Save to storage
    await storage.set({ prompts: data.prompts, folders: data.folders });
    
    console.log('✅ Prompt imported successfully');
    sendResponse({ success: true, message: 'Prompt imported successfully!' });
  } catch (error) {
    console.error('❌ Failed to import prompt:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Listen for alarms (scheduled prompts)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('🔔 Alarm fired:', alarm.name, 'at', new Date().toLocaleString());
  
  try {
    const data = await storage.get(['scheduled']);
    const schedule = data.scheduled?.find(s => s.id === alarm.name);
    
    if (schedule) {
      console.log(`📋 Executing scheduled prompt: ${schedule.promptId}`);
      // Get the prompt and execute it
      const promptData = await storage.get(['prompts']);
      const prompt = promptData.prompts[schedule.promptId];
      
      if (prompt) {
        // Execute the scheduled prompt
        await handlePromptInsertion({ text: prompt.body }, () => {});
      }
    } else {
      console.log(`❓ No schedule found for alarm: ${alarm.name}`);
    }
  } catch (error) {
    console.error('❌ Error in alarm listener:', error);
  }
});

// Initialize storage when service worker starts
initializeStorage();

console.log('✅ Prompt Suite Service Worker Ready!');