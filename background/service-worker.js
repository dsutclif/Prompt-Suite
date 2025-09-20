// Service worker for Prompt Library Extension

class ServiceWorker {
  constructor() {
    this.storage = new Storage();
    this.setupEventListeners();
    this.initializeStorage();
  }

  async initializeStorage() {
    const data = await this.storage.get(['version']);
    if (!data.version) {
      // Initialize default data structure
      await this.storage.set({
        version: 1,
        ui: {
          panelWidthByHost: { default: 360 }
        },
        settings: {
          goToLLM: null,
          autoOpenPreferred: true
        },
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
        recentPromptId: null
      });
    }
  }

  setupEventListeners() {
    // Action button click
    chrome.action.onClicked.addListener((tab) => {
      this.togglePanel(tab.id);
    });

    // Keyboard shortcuts
    chrome.commands.onCommand.addListener((command, tab) => {
      switch (command) {
        case 'toggle-panel':
          this.togglePanel(tab.id);
          break;
        case 'use-recent-prompt':
          this.useRecentPrompt(tab.id);
          break;
        case 'save-current-chat':
          this.saveCurrentChat(tab.id);
          break;
      }
    });

    // Message handling from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.isSupportedLLM(tab.url)) {
        // Re-inject content scripts if needed
        this.ensureContentScriptsInjected(tabId);
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'USE_PROMPT':
          await this.usePrompt(sender.tab.id, message.promptId);
          break;
        case 'SAVE_PROMPT':
          await this.savePrompt(message.promptData);
          break;
        case 'GET_LIBRARY_DATA':
          const data = await this.getLibraryData();
          sendResponse({ success: true, data });
          break;
        case 'UPDATE_LIBRARY_DATA':
          await this.updateLibraryData(message.data);
          sendResponse({ success: true });
          break;
        case 'TOGGLE_PANEL':
          await this.togglePanel(sender.tab.id);
          break;
        case 'REQUEST_LLM_CHOICE':
          await this.showLLMChooser(sender.tab.id);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async togglePanel(tabId) {
    await sendMessageToTab(tabId, { type: 'TOGGLE_PANEL' });
  }

  async usePrompt(tabId, promptId) {
    const data = await this.storage.get(['prompts']);
    const prompt = data.prompts[promptId];
    
    if (!prompt) {
      console.error('Prompt not found:', promptId);
      return;
    }

    // Update recent prompt
    await this.storage.set({ recentPromptId: promptId });

    // Check if current tab supports LLM insertion
    const tab = await chrome.tabs.get(tabId);
    if (this.isSupportedLLM(tab.url)) {
      await sendMessageToTab(tabId, { 
        type: 'INSERT_PROMPT', 
        text: prompt.body 
      });
    } else {
      // Open go-to LLM or show chooser
      await this.handleUnsupportedLLM(prompt.body);
    }
  }

  async useRecentPrompt(tabId) {
    const data = await this.storage.get(['recentPromptId']);
    if (data.recentPromptId) {
      await this.usePrompt(tabId, data.recentPromptId);
    } else {
      await this.showToast(tabId, 'No recent prompt found', 'warning');
    }
  }

  async saveCurrentChat(tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (!this.isSupportedLLM(tab.url)) {
      await this.showToast(tabId, 'No supported chat input found', 'error');
      return;
    }

    await sendMessageToTab(tabId, { type: 'READ_CURRENT_INPUT' });
  }

  async savePrompt(promptData) {
    const data = await this.storage.get(['prompts', 'folders']);
    const promptId = 'prm_' + Date.now();
    
    const newPrompt = {
      id: promptId,
      title: promptData.title,
      body: promptData.body,
      parentFolderId: promptData.parentFolderId || 'fld_root',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    data.prompts[promptId] = newPrompt;
    
    // Add to parent folder
    const parentFolder = data.folders.find(f => f.id === newPrompt.parentFolderId);
    if (parentFolder) {
      parentFolder.promptIds.push(promptId);
    }

    await this.storage.set({ prompts: data.prompts, folders: data.folders });
  }

  async handleUnsupportedLLM(promptText) {
    const settings = await this.storage.get(['settings']);
    
    if (!settings.settings.goToLLM) {
      // Show LLM chooser modal
      // This would typically open a popup or inject a modal
      return;
    }

    // Open preferred LLM
    const llmUrl = this.getLLMUrl(settings.settings.goToLLM);
    const tab = await chrome.tabs.create({ url: llmUrl });
    
    // Wait for page to load, then insert prompt
    setTimeout(async () => {
      await sendMessageToTab(tab.id, { 
        type: 'INSERT_PROMPT', 
        text: promptText 
      });
    }, 3000);
  }

  async getLibraryData() {
    return await this.storage.get(['folders', 'prompts', 'settings', 'ui']);
  }

  async updateLibraryData(data) {
    await this.storage.set(data);
  }

  async showToast(tabId, message, type = 'info') {
    await sendMessageToTab(tabId, { 
      type: 'SHOW_TOAST', 
      message, 
      toastType: type 
    });
  }

  isSupportedLLM(url) {
    const supportedDomains = [
      'claude.ai',
      'chat.openai.com',
      'gemini.google.com',
      'www.perplexity.ai'
    ];
    
    try {
      const urlObj = new URL(url);
      return supportedDomains.some(domain => urlObj.hostname === domain);
    } catch {
      return false;
    }
  }

  getLLMUrl(llmKey) {
    const urls = {
      claude: 'https://claude.ai/chat',
      chatgpt: 'https://chat.openai.com/',
      gemini: 'https://gemini.google.com/app',
      perplexity: 'https://www.perplexity.ai/'
    };
    return urls[llmKey] || urls.claude;
  }

  async ensureContentScriptsInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.promptLibraryInjected
      });
    } catch (error) {
      // Content script not injected, inject it
      console.log('Re-injecting content scripts for tab:', tabId);
    }
  }
}

// Initialize service worker
new ServiceWorker();
