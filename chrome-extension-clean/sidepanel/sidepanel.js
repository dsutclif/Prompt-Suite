// Side Panel JavaScript for Prompt Library Extension

class PromptLibrarySidePanel {
  constructor() {
    this.libraryData = {
      folders: [],
      prompts: {},
      settings: {},
      ui: {}
    };
    this.expandedFolders = new Set(['fld_root']);
    this.selectedFolderId = null;
    this.selectedLLM = null;
    this.lastCheckedUrl = null;
    this.init();
  }

  async init() {
    await this.loadLibraryData();
    this.setupEventListeners();
    this.setupImageSources();
    this.setupDataUpdateListener(); // Listen for external updates
    
    this.renderLibrary();
    this.checkForAutoLLMModal();
    
    // Simple permission check on load
    await this.checkAndShowBanner();
    
    // Set up direct tab navigation detection
    this.setupNavigationDetection();
  }

  setupDataUpdateListener() {
    // Listen for notifications from service worker about external data updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXTERNAL_DATA_UPDATED') {
        console.log('📡 Received external data update notification, refreshing...');
        this.loadLibraryData().then(() => {
          this.renderLibrary();
          this.showToast('New prompt imported!', 'success');
        });
      }
    });
  }

  async checkAndShowBanner() {
    try {
      console.log('Checking current tab for permission banner...');
      
      // Use lastFocusedWindow to ensure we get the actual focused tab
      const [activeTab] = await chrome.tabs.query({ 
        active: true, 
        lastFocusedWindow: true 
      });
      
      if (!activeTab || !activeTab.url) {
        console.log('No active tab found, hiding banner');
        this.hideBanner();
        return;
      }

      const url = activeTab.url;
      console.log('Current URL:', url);

      // Track URL changes
      if (this.lastCheckedUrl !== url) {
        console.log('URL changed from', this.lastCheckedUrl, 'to', url);
        this.lastCheckedUrl = url;
      }

      // Check if current site is an LLM platform
      const isLLMSite = url.includes('claude.ai') || 
                        url.includes('chatgpt.com') || 
                        url.includes('gemini.google.com') || 
                        url.includes('perplexity.ai');

      console.log('Is LLM site:', isLLMSite);

      if (!isLLMSite) {
        console.log('Not on LLM site, hiding banner');
        this.hideBanner();
        return;
      }

      // Check if we already have permission for this site
      const domain = new URL(url).origin + '/*';
      const hasPermission = await chrome.permissions.contains({
        origins: [domain]
      });

      console.log('LLM site detected:', domain, 'Has permission:', hasPermission);

      if (hasPermission) {
        console.log('Permission already granted, hiding banner');
        this.hideBanner();
      } else {
        console.log('No permission, showing banner for:', domain);
        this.showBanner(domain);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      this.hideBanner();
    }
  }

  showBanner(domain) {
    const alert = document.getElementById('permission-alert');
    if (!alert) return;

    // Store the origin for the grant button
    this.pendingPermissionOrigin = domain;
    
    // Reset button state for new domain
    const grantButton = document.getElementById('grant-permission-btn');
    if (grantButton) {
      grantButton.textContent = 'Grant Access';
      grantButton.disabled = false;
      grantButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // Show the banner
    alert.style.display = 'block';
    console.log('Permission banner shown for:', domain, '(button state reset)');
  }

  hideBanner() {
    const alert = document.getElementById('permission-alert');
    if (alert) {
      alert.style.display = 'none';
    }
    
    // Reset button state when hiding banner
    const grantButton = document.getElementById('grant-permission-btn');
    if (grantButton) {
      grantButton.textContent = 'Grant Access';
      grantButton.disabled = false;
      grantButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    this.pendingPermissionOrigin = null;
    console.log('Permission banner hidden (button state reset)');
  }

  setupNavigationDetection() {
    console.log('Setting up direct tab navigation detection...');
    
    // Listen to tab navigation events directly in sidepanel
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab navigation detected:', tab.url);
        this.checkAndShowBanner();
      }
    });
    
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log('Tab activation detected:', activeInfo.tabId);
      this.checkAndShowBanner();
    });
    
    // Listen for window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        console.log('Window focus changed:', windowId);
        this.checkAndShowBanner();
      }
    });
    
    console.log('Tab event listeners registered in sidepanel');
  }

  async requestPersistentPermission() {
    if (!this.pendingPermissionOrigin) return;

    try {
      const grantBtn = document.getElementById('grant-permission-btn');
      if (grantBtn) {
        grantBtn.textContent = 'Granting...';
        grantBtn.disabled = true;
      }

      // Request persistent host permission
      const granted = await chrome.permissions.request({
        origins: [this.pendingPermissionOrigin]
      });

      if (granted) {
        this.showToast('Permission granted! Prompts will now insert directly.', 'success');
        this.hideBanner();
      } else {
        this.showToast('Permission denied. Prompts will copy to clipboard.', 'info');
        if (grantBtn) {
          grantBtn.textContent = 'Grant Access';
          grantBtn.disabled = false;
        }
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      this.showToast('Permission request failed. Please try again.', 'error');
      const grantBtn = document.getElementById('grant-permission-btn');
      if (grantBtn) {
        grantBtn.textContent = 'Grant Access';
        grantBtn.disabled = false;
      }
    }
  }

  async checkForAutoLLMModal() {
    // Check if we should auto-open the LLM modal
    // This happens when user is on non-LLM site and has no preferred LLM
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab.url;
      const supportedDomains = ['claude.ai', 'chatgpt.com', 'gemini.google.com', 'perplexity.ai'];
      const isLLMPlatform = supportedDomains.some(domain => currentUrl.includes(domain));
      
      if (!isLLMPlatform && !this.libraryData.settings?.goToLLM) {
        // Not on LLM platform and no preferred LLM set - show settings
        console.log('🔧 Should show LLM modal - not on LLM platform and no preference set');
        setTimeout(() => {
          this.showLLMModal();
        }, 500);
      } else {
        console.log('🔧 Not showing LLM modal:', { 
          isLLMPlatform, 
          hasGoToLLM: !!this.libraryData.settings?.goToLLM 
        });
      }
    } catch (error) {
      console.log('Could not check current tab for auto LLM modal');
    }
  }

  setupEventListeners() {
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showLLMModal();
    });

    // Permission alert buttons
    const dismissBtn = document.getElementById('dismiss-permission-alert');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.hideBanner();
      });
    }

    const grantBtn = document.getElementById('grant-permission-btn');
    if (grantBtn) {
      grantBtn.addEventListener('click', async () => {
        await this.requestPersistentPermission();
      });
    }

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch(e.target.value);
      }
    });

    // Action buttons
    document.getElementById('add-folder-btn').addEventListener('click', () => {
      this.showAddFolderModal();
    });

    document.getElementById('add-prompt-btn').addEventListener('click', () => {
      this.showAddPromptModal();
    });

    // Export/Import buttons
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportLibrary();
    });

    document.getElementById('import-btn').addEventListener('click', () => {
      this.importLibrary();
    });

    // Save active button
    document.getElementById('save-active-btn')?.addEventListener('click', () => {
      this.saveActivePrompt();
    });

    // Modal event listeners
    this.setupModalEventListeners();
    
    // Message listener for service worker communications
    this.setupMessageListener();
  }

  setupModalEventListeners() {
    // LLM Modal
    const llmOptions = document.querySelectorAll('.llm-option');
    llmOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.selectLLM(option.dataset.llm);
      });
    });

    document.getElementById('save-llm-btn').addEventListener('click', () => {
      this.saveSelectedLLM();
    });

    document.getElementById('cancel-llm-btn').addEventListener('click', () => {
      this.hideAllModals();
    });

    // Add Folder Modal
    document.getElementById('add-folder-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('folder-name').value.trim();
      if (name) {
        this.createFolder(name);
        this.hideAllModals();
        document.getElementById('folder-name').value = '';
      }
    });

    document.getElementById('cancel-folder-btn').addEventListener('click', () => {
      this.hideAllModals();
    });

    // Save Prompt Modal
    document.getElementById('save-prompt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('prompt-title').value.trim();
      const content = document.getElementById('prompt-content').value.trim();
      const folderId = document.getElementById('prompt-folder').value || null;
      
      if (title && content) {
        this.createPrompt(title, content, folderId);
        this.hideAllModals();
        document.getElementById('save-prompt-form').reset();
      }
    });

    document.getElementById('cancel-prompt-btn').addEventListener('click', () => {
      this.hideAllModals();
    });

    // Inline add folder button
    document.getElementById('add-folder-inline-btn').addEventListener('click', () => {
      this.showInlineFolderInput();
    });

    document.getElementById('save-new-folder-btn').addEventListener('click', () => {
      this.saveInlineFolder();
    });

    document.getElementById('cancel-new-folder-btn').addEventListener('click', () => {
      this.hideInlineFolderInput();
    });

    // Modal overlay click to close
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideAllModals();
      }
    });
  }

  setupImageSources() {
    // Setup LLM logo images
    const logoMappings = {
      claude: 'claude.png',
      chatgpt: 'chatgpt.png', 
      gemini: 'gemini.png',
      perplexity: 'perplexity.png'
    };

    Object.entries(logoMappings).forEach(([llm, filename]) => {
      const icon = document.querySelector(`[data-logo="${llm}"] img`);
      if (icon) {
        icon.src = chrome.runtime.getURL(`icons/llm-logos/${filename}`);
      }
    });
  }

  setupMessageListener() {
    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SCHEDULED_PROMPT_EXECUTED') {
        console.log('📨 Scheduled prompt executed - refreshing UI');
        // Reload data and refresh UI when scheduled prompt executes
        this.loadLibraryData().then(() => {
          this.renderLibrary();
        });
      }
    });
  }

  async loadLibraryData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_LIBRARY_DATA' });
      if (response && response.success) {
        // Reconstruct libraryData from individual storage keys
        this.libraryData = {
          folders: response.data.folders || [],
          prompts: response.data.prompts || {},
          settings: response.data.settings || {},
          scheduled: response.data.scheduled || []
        };
      } else {
        console.error('Failed to load library data:', response);
        // Initialize with empty data - NO sample data
        this.libraryData = { 
          folders: [], 
          prompts: {},
          settings: {},
          scheduled: []
        };
      }
      
      console.log('📚 Library data loaded:', {
        folders: this.libraryData.folders.length,
        prompts: Object.keys(this.libraryData.prompts).length,
        settings: this.libraryData.settings
      });
      
    } catch (error) {
      console.error('Error loading library data:', error);
      // Initialize with empty data on error - NO sample data
      this.libraryData = { 
        folders: [], 
        prompts: {},
        settings: {},
        scheduled: []
      };
    }
  }

  async saveLibraryData() {
    try {
      // Save as individual keys to match service worker expectations
      const dataToSave = {
        folders: this.libraryData.folders || [],
        prompts: this.libraryData.prompts || {},
        settings: this.libraryData.settings || {},
        scheduled: this.libraryData.scheduled || []
      };
      
      await chrome.runtime.sendMessage({ 
        type: 'SAVE_LIBRARY_DATA', 
        data: dataToSave 
      });
    } catch (error) {
      console.error('Error saving library data:', error);
    }
  }

  loadSampleData() {
    this.libraryData = {
      folders: [
        {
          id: 'fld_writing',
          name: 'Writing & Communication',
          parentId: null,
          childFolderIds: [],
          promptIds: ['pmt_email']
        },
        {
          id: 'fld_coding',
          name: 'Code & Development',
          parentId: null,
          childFolderIds: [],
          promptIds: ['pmt_review']
        }
      ],
      prompts: {
        'pmt_email': {
          id: 'pmt_email',
          title: 'Email Draft',
          body: 'Help me write a professional email about...',
          folderId: 'fld_writing',
          lastUsed: new Date().toISOString()
        },
        'pmt_review': {
          id: 'pmt_review',
          title: 'Code Review',
          body: 'Please review this code for best practices, security issues, and potential improvements...',
          folderId: 'fld_coding',
          lastUsed: new Date(Date.now() - 86400000).toISOString()
        }
      },
      settings: {},
      ui: {}
    };
  }

  renderLibrary() {
    const content = document.getElementById('library-content');
    const rootFolders = this.libraryData.folders?.filter(f => !f.parentId) || [];
    const rootPrompts = Object.values(this.libraryData.prompts || {}).filter(p => !p.folderId);

    let html = '';
    
    // Root folders FIRST
    rootFolders.forEach(folder => {
      html += this.renderFolder(folder);
    });

    // Root prompts (prompts without a folder)
    if (rootPrompts.length > 0) {
      html += `
        <div class="folder-section">
          <div class="folder-header">
            <div class="folder-name">Uncategorized</div>
          </div>
          <div class="folder-content">
      `;
      
      rootPrompts.forEach(prompt => {
        html += this.renderPrompt(prompt);
      });
      
      html += '</div></div>';
    }
    
    // Add recently used prompts section AFTER folders
    html += this.renderRecentlyUsed();
    
    // Add scheduled prompts section AFTER recently used
    html += this.renderScheduledPrompts();
    
    // Show empty state only if no content at all
    if (!html.trim() && rootFolders.length === 0 && rootPrompts.length === 0) {
      content.innerHTML = '<div class="empty-state">Your library is empty. Add a folder or prompt to get started.</div>';
      return;
    }

    content.innerHTML = html;

    this.updateStats();
    this.attachEventListeners();
  }

  renderFolder(folder) {
    const isExpanded = this.expandedFolders.has(folder.id);
    const isSelected = this.selectedFolderId === folder.id;
    const childFolders = this.libraryData.folders?.filter(f => f.parentId === folder.id) || [];
    const folderPrompts = Object.values(this.libraryData.prompts || {}).filter(p => p.folderId === folder.id);
    const totalItems = childFolders.length + folderPrompts.length;

    let html = `
      <div class="folder-item ${isSelected ? 'selected' : ''}" data-folder-id="${folder.id}">
        <div class="folder-container">
          <button class="delete-folder-btn" data-action="delete-folder" data-folder-id="${folder.id}" title="Delete folder">🗑️</button>
          <button class="folder-button" data-action="toggle-folder" data-folder-id="${folder.id}">
            <svg class="disclosure-triangle ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
            <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
            </svg>
            <span class="folder-name">${folder.name}</span>
            <div class="folder-actions">
              <span class="item-count">${totalItems}</span>
            </div>
          </button>
        </div>
      </div>
    `;

    if (isExpanded) {
      html += '<div class="folder-contents">';
      
      // Child folders
      childFolders.forEach(childFolder => {
        html += this.renderFolder(childFolder);
      });

      // Folder prompts
      folderPrompts.forEach(prompt => {
        html += this.renderPrompt(prompt);
      });

      html += '</div>';
    }

    return html;
  }

  renderPrompt(prompt, isRecent = false) {
    const preview = prompt.body.length > 35 ? prompt.body.substring(0, 35) + '...' : prompt.body;
    const isCompleted = prompt.status === 'completed' && isRecent;
    const titleClass = isCompleted ? 'prompt-title-completed' : 'prompt-title';
    
    // Use different delete action for recently used vs regular prompts
    const deleteAction = isRecent ? 'remove-from-recent' : 'delete-prompt';
    const deleteTitle = isRecent ? 'Remove from recently used' : 'Delete prompt';
    
    return `
      <div class="prompt-item" data-prompt-id="${prompt.id}" draggable="true">
        <div class="prompt-container">
          <button class="delete-prompt-btn" data-action="${deleteAction}" data-prompt-id="${prompt.id}" title="${deleteTitle}">🗑️</button>
          <button class="prompt-button" data-action="use-prompt" data-prompt-id="${prompt.id}">
            <div class="prompt-info">
              <div class="${titleClass}">${prompt.title}</div>
              <div class="prompt-preview">${preview}</div>
            </div>
          </button>
          <button class="edit-prompt-btn" data-action="edit-prompt" data-prompt-id="${prompt.id}" title="Edit prompt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
            </svg>
          </button>
          <button class="schedule-prompt-btn" data-action="schedule-prompt" data-prompt-id="${prompt.id}" title="Schedule prompt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  renderRecentlyUsed() {
    const recentPrompts = Object.values(this.libraryData.prompts || {})
      .filter(p => p.lastUsed)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 5);

    if (recentPrompts.length === 0) {
      return `
        <div class="recent-section">
          <div class="section-title">Recently Used</div>
          <div class="empty-state">No recent prompts</div>
        </div>
      `;
    }

    let html = `
      <div class="recent-section">
        <div class="section-title">Recently Used</div>
    `;

    recentPrompts.forEach(prompt => {
      html += this.renderPrompt(prompt, true);
    });

    html += '</div>';

    return html;
  }

  renderScheduledPrompts() {
    const scheduledPrompts = this.getScheduledPrompts();
    
    if (scheduledPrompts.length === 0) {
      return '';
    }

    let html = `
      <div class="scheduled-section">
        <div class="section-title">Scheduled Prompts</div>
    `;

    scheduledPrompts.forEach(schedule => {
      html += this.renderScheduledPrompt(schedule);
    });

    html += '</div>';
    return html;
  }

  renderScheduledPrompt(schedule) {
    const prompt = this.libraryData.prompts[schedule.promptId];
    if (!prompt) return '';

    const scheduledTime = new Date(schedule.scheduleTime);
    const isActive = scheduledTime > new Date();
    const timeDisplay = scheduledTime.toLocaleString();
    const statusClass = isActive ? 'scheduled-active' : 'scheduled-expired';
    const preview = prompt.body.length > 35 ? prompt.body.substring(0, 35) + '...' : prompt.body;
    
    return `
      <div class="prompt-item ${statusClass}" data-schedule-id="${schedule.id}">
        <div class="scheduled-prompt-container">
          <button class="delete-prompt-btn" data-action="delete-schedule" data-schedule-id="${schedule.id}" title="Cancel scheduled prompt">🗑️</button>
          <div class="scheduled-prompt-info">
            <div class="prompt-title">${prompt.title}</div>
            <div class="prompt-preview">${preview}</div>
            <div class="schedule-time">${isActive ? 'Scheduled for' : 'Was scheduled for'}: ${timeDisplay}</div>
          </div>
          <div class="scheduled-prompt-actions">
            <button class="edit-prompt-btn" data-action="edit-schedule" data-schedule-id="${schedule.id}" title="Edit schedule">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }



  attachEventListeners() {
    // Folder toggle
    document.querySelectorAll('[data-action="toggle-folder"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderId = btn.dataset.folderId;
        this.toggleFolder(folderId);
      });
    });

    // Folder selection
    document.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action]')) {
          const folderId = item.dataset.folderId;
          this.selectFolder(folderId);
        }
      });
    });

    // Double-click folder name editing
    document.querySelectorAll('.folder-name').forEach(nameElement => {
      nameElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const folderId = e.target.closest('.folder-item').dataset.folderId;
        this.startFolderEdit(folderId, nameElement);
      });
    });

    // Prompt usage
    document.querySelectorAll('[data-action="use-prompt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        this.usePrompt(promptId);
      });
    });

    // Delete actions
    document.querySelectorAll('[data-action="delete-folder"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderId = btn.dataset.folderId;
        this.deleteFolder(folderId);
      });
    });

    document.querySelectorAll('[data-action="delete-prompt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        this.deletePrompt(promptId);
      });
    });

    // Remove from recently used
    document.querySelectorAll('[data-action="remove-from-recent"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        this.removeFromRecentlyUsed(promptId);
      });
    });

    // Edit prompt actions
    document.querySelectorAll('[data-action="edit-prompt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        this.editPrompt(promptId);
      });
    });

    // Schedule prompt actions
    document.querySelectorAll('[data-action="schedule-prompt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        this.schedulePrompt(promptId);
      });
    });

    // Delete schedule actions
    document.querySelectorAll('[data-action="delete-schedule"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scheduleId = btn.dataset.scheduleId;
        this.deleteSchedule(scheduleId);
      });
    });

    // Edit schedule actions
    document.querySelectorAll('[data-action="edit-schedule"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scheduleId = btn.dataset.scheduleId;
        this.editSchedule(scheduleId);
      });
    });

    // Drag and drop
    this.setupDragAndDrop();
  }

  setupDragAndDrop() {
    // Drag start
    document.querySelectorAll('.prompt-item[draggable]').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.promptId);
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });

    // Drop targets
    document.querySelectorAll('.folder-item').forEach(folder => {
      folder.addEventListener('dragover', (e) => {
        e.preventDefault();
        folder.classList.add('drag-over');
      });

      folder.addEventListener('dragleave', () => {
        folder.classList.remove('drag-over');
      });

      folder.addEventListener('drop', (e) => {
        e.preventDefault();
        folder.classList.remove('drag-over');
        
        const promptId = e.dataTransfer.getData('text/plain');
        const targetFolderId = folder.dataset.folderId;
        
        this.movePromptToFolder(promptId, targetFolderId);
      });
    });
  }

  toggleFolder(folderId) {
    if (this.expandedFolders.has(folderId)) {
      this.expandedFolders.delete(folderId);
    } else {
      this.expandedFolders.add(folderId);
    }
    this.renderLibrary();
  }

  selectFolder(folderId) {
    this.selectedFolderId = this.selectedFolderId === folderId ? null : folderId;
    this.renderLibrary();
  }

  async usePrompt(promptId) {
    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;

    // Check permissions before using prompt
    await this.checkAndShowBanner();

    // Update last used
    prompt.lastUsed = new Date().toISOString();
    prompt.status = 'inserting'; // Add status tracking
    await this.saveLibraryData();

    // Route through background service worker for proper content script injection
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'INSERT_PROMPT',
        text: prompt.body
      });
      
      if (response && response.success) {
        if (response.method === 'clipboard') {
          this.showToast('Copied to clipboard', 'success');
          prompt.status = 'completed'; // Mark as completed for clipboard fallback
        } else {
          this.showToast('Prompt inserted successfully!', 'success');
          // Start monitoring for LLM response completion
          this.monitorLLMResponse(promptId);
          // Hide permission banner if it was shown (user has now granted access)
          this.hideBanner();
        }
      } else {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(prompt.body);
          this.showToast('Copied to clipboard', 'success');
          prompt.status = 'completed'; // Mark as completed for clipboard fallback
        } catch (clipboardError) {
          this.showToast('Failed to insert prompt: ' + (response?.error || 'Unknown error'), 'error');
        }
      }
    } catch (error) {
      // Fallback to clipboard on any error
      try {
        await navigator.clipboard.writeText(prompt.body);
        this.showToast('Prompt copied to clipboard', 'success');
        prompt.status = 'completed';
      } catch (clipError) {
        this.showToast('Failed to copy prompt', 'error');
      }
    }

    this.renderLibrary();
  }

  async monitorLLMResponse(promptId) {
    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;

    // Start polling for LLM response completion
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max monitoring
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      try {
        // Check if LLM has finished responding by looking for typical "done" indicators
        const response = await chrome.runtime.sendMessage({
          type: 'CHECK_LLM_STATUS'
        });
        
        if (response && response.completed) {
          // LLM finished responding - mark prompt as completed (green)
          prompt.status = 'completed';
          await this.saveLibraryData();
          this.renderLibrary();
          clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
          // Timeout - assume completed
          prompt.status = 'completed';
          await this.saveLibraryData();
          this.renderLibrary();
          clearInterval(checkInterval);
        }
      } catch (error) {
        // On error, assume completed after a delay
        if (attempts >= 10) { // 10 second fallback
          prompt.status = 'completed';
          await this.saveLibraryData();
          this.renderLibrary();
          clearInterval(checkInterval);
        }
      }
    }, 1000); // Check every second
  }

  exportLibrary() {
    try {
      // Create export data with timestamp
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: this.libraryData
      };

      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create and trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-library-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showToast('Library exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('Export failed', 'error');
    }
  }

  importLibrary() {
    try {
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const text = await file.text();
          const importData = JSON.parse(text);
          
          // Validate import data structure
          if (!importData.data || !importData.version) {
            throw new Error('Invalid file format');
          }
          
          // Confirm import with user
          const importedData = importData.data;
          const folderCount = importedData.folders ? importedData.folders.length : 0;
          const promptCount = importedData.prompts ? Object.keys(importedData.prompts).length : 0;
          
          if (confirm(`Import ${folderCount} folders and ${promptCount} prompts? This will add them to your existing library.`)) {
            // Initialize library data if needed
            if (!this.libraryData.folders) this.libraryData.folders = [];
            if (!this.libraryData.prompts) this.libraryData.prompts = {};
            
            // Create ID mapping for folders to avoid conflicts
            const folderIdMap = {};
            let addedFolders = 0;
            let addedPrompts = 0;
            
            // Import folders with new IDs
            if (importedData.folders) {
              for (const folder of importedData.folders) {
                const newFolderId = 'fld_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                folderIdMap[folder.id] = newFolderId;
                
                const newFolder = {
                  ...folder,
                  id: newFolderId,
                  childFolderIds: [],
                  promptIds: []
                };
                
                this.libraryData.folders.push(newFolder);
                addedFolders++;
              }
              
              // Update folder relationships using the ID mapping
              for (const folder of importedData.folders) {
                const newFolder = this.libraryData.folders.find(f => f.id === folderIdMap[folder.id]);
                if (newFolder && folder.childFolderIds) {
                  newFolder.childFolderIds = folder.childFolderIds
                    .map(childId => folderIdMap[childId])
                    .filter(id => id); // Remove unmapped IDs
                }
                
                // Set parent relationships
                if (folder.parentId && folderIdMap[folder.parentId]) {
                  newFolder.parentId = folderIdMap[folder.parentId];
                } else {
                  newFolder.parentId = null; // Import to root level if parent not found
                }
              }
            }
            
            // Import prompts with new IDs
            if (importedData.prompts) {
              for (const [oldPromptId, prompt] of Object.entries(importedData.prompts)) {
                const newPromptId = 'pmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                const newPrompt = {
                  ...prompt,
                  id: newPromptId
                };
                
                // Update folder reference if it exists
                if (prompt.folderId && folderIdMap[prompt.folderId]) {
                  newPrompt.folderId = folderIdMap[prompt.folderId];
                  
                  // Add prompt to the folder's prompt list
                  const targetFolder = this.libraryData.folders.find(f => f.id === folderIdMap[prompt.folderId]);
                  if (targetFolder) {
                    if (!targetFolder.promptIds) targetFolder.promptIds = [];
                    targetFolder.promptIds.push(newPromptId);
                  }
                } else {
                  newPrompt.folderId = null; // Import to root level if folder not found
                }
                
                this.libraryData.prompts[newPromptId] = newPrompt;
                addedPrompts++;
              }
            }
            
            // Save to storage
            await chrome.runtime.sendMessage({
              type: 'SAVE_LIBRARY_DATA',
              data: this.libraryData
            });
            
            // Refresh UI
            this.renderLibrary();
            this.showToast(`Imported ${addedFolders} folders and ${addedPrompts} prompts`, 'success');
          }
        } catch (error) {
          console.error('Import failed:', error);
          this.showToast('Import failed - invalid file format', 'error');
        }
        
        // Clean up
        document.body.removeChild(input);
      });
      
      document.body.appendChild(input);
      input.click();
    } catch (error) {
      console.error('Import setup failed:', error);
      this.showToast('Import failed', 'error');
    }
  }

  createFolder(name) {
    const folderId = 'fld_' + Date.now();
    const newFolder = {
      id: folderId,
      name: name,
      parentId: this.selectedFolderId,
      childFolderIds: [],
      promptIds: []
    };

    if (!this.libraryData.folders) this.libraryData.folders = [];
    this.libraryData.folders.push(newFolder);

    if (this.selectedFolderId) {
      const parentFolder = this.libraryData.folders.find(f => f.id === this.selectedFolderId);
      if (parentFolder) {
        if (!parentFolder.childFolderIds) parentFolder.childFolderIds = [];
        parentFolder.childFolderIds.push(folderId);
      }
    }

    this.saveLibraryData();
    this.renderLibrary();
    this.showToast(`Folder "${name}" created`, 'success');
  }

  createPrompt(title, body, folderId = null) {
    const promptId = 'pmt_' + Date.now();
    const newPrompt = {
      id: promptId,
      title: title,
      body: body,
      folderId: folderId,
      created: new Date().toISOString()
    };

    if (!this.libraryData.prompts) this.libraryData.prompts = {};
    this.libraryData.prompts[promptId] = newPrompt;

    if (folderId) {
      const folder = this.libraryData.folders?.find(f => f.id === folderId);
      if (folder) {
        if (!folder.promptIds) folder.promptIds = [];
        folder.promptIds.push(promptId);
      }
    }

    this.saveLibraryData();
    this.renderLibrary();
    this.showToast(`Prompt "${title}" created`, 'success');
  }

  deleteFolder(folderId) {
    if (!confirm('Delete this folder and all its contents?')) return;

    // Delete recursively
    this.deleteFolderRecursive(folderId);
    this.saveLibraryData();
    this.renderLibrary();
    this.showToast('Folder deleted', 'success');
  }

  deleteFolderRecursive(folderId) {
    const folder = this.libraryData.folders?.find(f => f.id === folderId);
    if (!folder) return;

    // Delete child folders
    if (folder.childFolderIds) {
      folder.childFolderIds.forEach(childId => {
        this.deleteFolderRecursive(childId);
      });
    }

    // Delete prompts in this folder
    if (folder.promptIds) {
      folder.promptIds.forEach(promptId => {
        delete this.libraryData.prompts[promptId];
      });
    }

    // Remove from parent folder
    if (folder.parentId) {
      const parent = this.libraryData.folders?.find(f => f.id === folder.parentId);
      if (parent && parent.childFolderIds) {
        parent.childFolderIds = parent.childFolderIds.filter(id => id !== folderId);
      }
    }

    // Remove folder itself
    this.libraryData.folders = this.libraryData.folders?.filter(f => f.id !== folderId) || [];
  }

  deletePrompt(promptId) {
    if (!confirm('Delete this prompt?')) return;

    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;

    // Remove from folder
    if (prompt.folderId) {
      const folder = this.libraryData.folders?.find(f => f.id === prompt.folderId);
      if (folder && folder.promptIds) {
        folder.promptIds = folder.promptIds.filter(id => id !== promptId);
      }
    }

    // Delete prompt
    delete this.libraryData.prompts[promptId];

    this.saveLibraryData();
    this.renderLibrary();
    this.showToast('Prompt deleted', 'success');
  }

  removeFromRecentlyUsed(promptId) {
    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;

    // Remove the lastUsed property to remove it from recently used list
    delete prompt.lastUsed;

    this.saveLibraryData();
    this.renderLibrary();
    this.showToast('Removed from recently used', 'success');
  }

  movePromptToFolder(promptId, targetFolderId) {
    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;

    // Remove from old folder
    if (prompt.folderId) {
      const oldFolder = this.libraryData.folders?.find(f => f.id === prompt.folderId);
      if (oldFolder && oldFolder.promptIds) {
        oldFolder.promptIds = oldFolder.promptIds.filter(id => id !== promptId);
      }
    }

    // Add to new folder
    prompt.folderId = targetFolderId;
    const newFolder = this.libraryData.folders?.find(f => f.id === targetFolderId);
    if (newFolder) {
      if (!newFolder.promptIds) newFolder.promptIds = [];
      newFolder.promptIds.push(promptId);
    }

    this.saveLibraryData();
    this.renderLibrary();
    this.showToast('Prompt moved', 'success');
  }

  handleSearch(query) {
    if (!query.trim()) {
      this.renderLibrary();
      return;
    }

    const matchingPrompts = Object.values(this.libraryData.prompts || {})
      .filter(prompt => 
        prompt.title.toLowerCase().includes(query.toLowerCase()) ||
        prompt.body.toLowerCase().includes(query.toLowerCase())
      );

    const content = document.getElementById('library-content');
    if (matchingPrompts.length === 0) {
      content.innerHTML = '<div class="empty-state">No prompts found matching your search.</div>';
    } else {
      let html = '<div class="section-title">Search Results</div>';
      matchingPrompts.forEach(prompt => {
        html += this.renderPrompt(prompt);
      });
      content.innerHTML = html;
    }

    this.attachEventListeners();
  }

  updateStats() {
    const totalPrompts = Object.keys(this.libraryData.prompts || {}).length;
    const totalFolders = (this.libraryData.folders || []).length;
    document.getElementById('stats-text').innerHTML = 
      `${totalPrompts} prompts in ${totalFolders} folders • <a href="mailto:dsutclif@mit.edu" style="color: #6b7280; text-decoration: none;">Share Feedback</a>`;
  }

  // Modal functions
  showModal(modalId) {
    document.getElementById('modal-overlay').classList.add('visible');
    document.getElementById(modalId).classList.add('visible');
  }

  hideAllModals() {
    document.getElementById('modal-overlay').classList.remove('visible');
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('visible');
    });
  }

  showLLMModal() {
    // Set current selection
    if (this.libraryData.settings?.goToLLM) {
      document.querySelectorAll('.llm-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.llm === this.libraryData.settings.goToLLM);
      });
      this.selectedLLM = this.libraryData.settings.goToLLM;
    }
    
    this.showModal('llm-chooser-modal');
  }

  showAddFolderModal() {
    this.showModal('add-folder-modal');
  }

  showAddPromptModal() {
    this.populateFolderSelect();
    this.showModal('save-prompt-modal');
  }

  populateFolderSelect() {
    const select = document.getElementById('prompt-folder');
    select.innerHTML = '<option value="">Root (No folder)</option>';
    
    const addFolderOptions = (folders, prefix = '') => {
      folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = prefix + folder.name;
        select.appendChild(option);
        
        const childFolders = this.libraryData.folders?.filter(f => f.parentId === folder.id) || [];
        if (childFolders.length > 0) {
          addFolderOptions(childFolders, prefix + '  ');
        }
      });
    };

    const rootFolders = this.libraryData.folders?.filter(f => !f.parentId) || [];
    addFolderOptions(rootFolders);
  }

  selectLLM(llmType) {
    const selectedOption = document.querySelector(`[data-llm="${llmType}"]`);
    
    // Check if this LLM is already selected - if so, deselect it
    if (selectedOption && selectedOption.classList.contains('selected')) {
      selectedOption.classList.remove('selected');
      this.selectedLLM = null;
      return;
    }

    // Remove selected class from all options
    document.querySelectorAll('.llm-option').forEach(option => {
      option.classList.remove('selected');
    });

    // Add selected class to clicked option
    if (selectedOption) {
      selectedOption.classList.add('selected');
      this.selectedLLM = llmType;
    }
  }

  async saveSelectedLLM() {
    // Save the selected LLM (can be null if deselected)
    if (!this.libraryData.settings) this.libraryData.settings = {};
    this.libraryData.settings.goToLLM = this.selectedLLM;
    await this.saveLibraryData();
    
    // Close the modal first
    this.hideAllModals();
    
    if (this.selectedLLM) {
      // Open the selected LLM
      const urls = {
        claude: 'https://claude.ai',
        chatgpt: 'https://chatgpt.com',
        gemini: 'https://gemini.google.com',
        perplexity: 'https://www.perplexity.ai'
      };
      
      const url = urls[this.selectedLLM];
      if (url) {
        // Get current tab and send message to background to handle LLM opening
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        try {
          await chrome.runtime.sendMessage({
            type: 'OPEN_LLM_AND_CLOSE_PANEL',
            llm: this.selectedLLM,
            currentTabId: currentTab.id
          });
          this.showToast(`Opening ${this.selectedLLM}...`, 'success');
        } catch (error) {
          // Fallback to simple tab creation
          await chrome.tabs.update({ url });
          this.showToast(`Navigating to ${this.selectedLLM}...`, 'success');
        }
      }
    } else {
      this.showToast('LLM preference cleared', 'info');
    }
  }

  showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#3b82f6' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  showInlineFolderInput() {
    document.getElementById('new-folder-input').style.display = 'block';
    document.getElementById('new-folder-name').focus();
  }

  hideInlineFolderInput() {
    document.getElementById('new-folder-input').style.display = 'none';
    document.getElementById('new-folder-name').value = '';
  }

  saveInlineFolder() {
    const folderName = document.getElementById('new-folder-name').value.trim();
    if (folderName) {
      this.createFolder(folderName);
      this.populateFolderSelect();
      
      // Select the newly created folder
      const folders = this.libraryData.folders || [];
      const newFolder = folders.find(f => f.name === folderName);
      if (newFolder) {
        document.getElementById('prompt-folder').value = newFolder.id;
      }
      
      this.hideInlineFolderInput();
      this.showToast(`Folder "${folderName}" created`, 'success');
    }
  }

  async saveActivePrompt() {
    console.log('Save Active Prompt clicked - starting process...');
    
    try {
      // First attempt: Try to read from the current active tab
      const response = await chrome.runtime.sendMessage({
        type: 'READ_CURRENT_INPUT'
      });
      
      console.log('Read current input response:', response);
      
      if (response && response.success && response.text && response.text.trim()) {
        // Successfully captured text from LLM platform
        console.log('Successfully captured text (length:', response.text.length, '):', response.text.substring(0, 100) + '...');
        console.log('About to call showPromptModal with captured text...');
        this.showPromptModal('', response.text.trim(), this.selectedFolderId);
        this.showToast('Captured current input text!', 'success');
        
        // Refresh connection after successful operation to prevent future failures
        setTimeout(() => {
          console.log('🔄 Refreshing content script connection for future operations...');
          chrome.runtime.sendMessage({ type: 'REFRESH_CONNECTION' }).catch(() => {
            // Silent fail - this is just a preventive measure
          });
        }, 100);
        
        return;
      }
      
      // If direct reading failed, show helpful guidance
      console.log('Direct reading failed - this might be due to page refresh or content script disconnection');
      
      // Second attempt: Try clipboard as fallback
      console.log('Trying clipboard as fallback...');
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          console.log('Found clipboard text:', clipboardText.substring(0, 50) + '...');
          this.showPromptModal('', clipboardText.trim(), this.selectedFolderId);
          this.showToast('Using clipboard text - if this isn\'t what you wanted, try refreshing the page', 'info');
          return;
        }
      } catch (clipError) {
        console.log('Clipboard access failed:', clipError);
      }
      
      // Manual entry with helpful guidance
      console.log('All automatic methods failed, showing manual entry modal');
      this.showPromptModal('', '', this.selectedFolderId);
      this.showToast('Please copy your text first, then try Save Active again, or enter manually', 'info');
      
    } catch (error) {
      console.error('Save active prompt failed:', error);
      // Always show modal as fallback
      this.showPromptModal('', '', this.selectedFolderId);
      this.showToast('Tip: Copy your text first, then click Save Active, or enter manually', 'info');
    }
  }

  showPromptModal(title = '', body = '', folderId = null) {
    console.log('showPromptModal called with:', { title, body: body?.substring(0, 100), folderId });
    
    const titleElement = document.getElementById('prompt-title');
    const bodyElement = document.getElementById('prompt-content'); // Fixed: was 'prompt-body', should be 'prompt-content'
    const folderElement = document.getElementById('prompt-folder');
    
    console.log('Modal elements found:', { 
      titleElement: !!titleElement, 
      bodyElement: !!bodyElement, 
      folderElement: !!folderElement 
    });
    
    if (titleElement) {
      titleElement.value = title;
      console.log('Set title to:', title);
    }
    if (bodyElement) {
      bodyElement.value = body;
      console.log('Set body to:', body?.substring(0, 100) + '...');
    }
    if (folderElement) {
      folderElement.value = folderId || '';
      console.log('Set folder to:', folderId);
    }
    
    this.populateFolderSelect();
    this.showModal('save-prompt-modal');
  }

  editPrompt(promptId) {
    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;
    
    this.showEditPromptModal(prompt);
  }

  showEditPromptModal(prompt) {
    const modalHtml = `
      <div class="modal-overlay" id="edit-modal-overlay">
        <div class="modal" id="edit-prompt-modal">
          <div class="modal-content">
            <div class="modal-title">Edit Prompt</div>
            <div class="form-group">
              <label for="edit-prompt-title">Title:</label>
              <input type="text" id="edit-prompt-title" value="${prompt.title}" class="form-input">
            </div>
            <div class="form-group">
              <label for="edit-prompt-body">Prompt:</label>
              <textarea id="edit-prompt-body" class="form-textarea" rows="6">${prompt.body}</textarea>
            </div>
            <div class="modal-buttons">
              <button class="modal-btn secondary" id="edit-cancel-btn">Cancel</button>
              <button class="modal-btn primary" id="edit-save-btn" data-prompt-id="${prompt.id}">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing edit modal if any
    const existingModal = document.getElementById('edit-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('edit-modal-overlay').classList.add('visible');
    document.getElementById('edit-prompt-modal').classList.add('visible');
    
    // Add event listeners
    document.getElementById('edit-cancel-btn').addEventListener('click', () => {
      this.hideEditModal();
    });
    
    document.getElementById('edit-save-btn').addEventListener('click', (e) => {
      const promptId = e.target.dataset.promptId;
      this.saveEditedPrompt(promptId);
    });
    
    // Close on overlay click
    document.getElementById('edit-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideEditModal();
      }
    });
  }

  hideEditModal() {
    const modal = document.getElementById('edit-modal-overlay');
    if (modal) {
      modal.remove();
    }
  }

  async saveEditedPrompt(promptId) {
    const title = document.getElementById('edit-prompt-title').value.trim();
    const body = document.getElementById('edit-prompt-body').value.trim();
    
    if (!title || !body) {
      this.showToast('Please fill in both title and prompt text', 'error');
      return;
    }

    const prompt = this.libraryData.prompts[promptId];
    if (prompt) {
      prompt.title = title;
      prompt.body = body;
      prompt.lastModified = new Date().toISOString();
      
      await this.saveLibraryData();
      this.renderLibrary();
      this.showToast('Prompt updated successfully', 'success');
    }
    
    this.hideEditModal();
  }

  schedulePrompt(promptId, existingSchedule = null) {
    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;
    
    this.showSchedulePromptModal(prompt, existingSchedule);
  }

  showSchedulePromptModal(prompt, existingSchedule = null) {
    const now = new Date();
    // Use current local time, not UTC
    const defaultTime = existingSchedule 
      ? new Date(existingSchedule.scheduleTime)
      : now;
    
    // Format for datetime-local input (needs local time, not UTC)
    const year = defaultTime.getFullYear();
    const month = String(defaultTime.getMonth() + 1).padStart(2, '0');
    const day = String(defaultTime.getDate()).padStart(2, '0');
    const hours = String(defaultTime.getHours()).padStart(2, '0');
    const minutes = String(defaultTime.getMinutes()).padStart(2, '0');
    const timeString = `${year}-${month}-${day}T${hours}:${minutes}`;
    const isAutoSubmit = existingSchedule ? existingSchedule.autoSubmit : true;
    
    const modalHtml = `
      <div class="modal-overlay" id="schedule-modal-overlay">
        <div class="modal" id="schedule-prompt-modal">
          <div class="modal-content">
            <div class="modal-title">Schedule Prompt</div>
            <div class="form-group">
              <label>Prompt: <strong>${prompt.title}</strong></label>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                ${prompt.body.length > 50 ? prompt.body.substring(0, 50) + '...' : prompt.body}
              </div>
            </div>
            <div class="form-group">
              <label for="schedule-time">Schedule for:</label>
              <input type="datetime-local" id="schedule-time" value="${timeString}" class="form-input">
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="auto-submit" ${isAutoSubmit ? 'checked' : ''}> 
                Auto-submit after pasting
              </label>
            </div>
            <div class="modal-buttons">
              <button class="modal-btn secondary" id="schedule-cancel-btn">Cancel</button>
              <button class="modal-btn primary" id="schedule-save-btn" data-prompt-id="${prompt.id}" ${existingSchedule ? `data-schedule-id="${existingSchedule.id}"` : ''}>
                ${existingSchedule ? 'Update Schedule' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing schedule modal if any
    const existingModal = document.getElementById('schedule-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('schedule-modal-overlay').classList.add('visible');
    document.getElementById('schedule-prompt-modal').classList.add('visible');
    
    // Add event listeners
    document.getElementById('schedule-cancel-btn').addEventListener('click', () => {
      this.hideScheduleModal();
    });
    
    document.getElementById('schedule-save-btn').addEventListener('click', (e) => {
      const promptId = e.target.dataset.promptId;
      const scheduleId = e.target.dataset.scheduleId || null;
      this.saveScheduledPrompt(promptId, scheduleId);
    });
    
    // Close on overlay click
    document.getElementById('schedule-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideScheduleModal();
      }
    });
  }

  hideScheduleModal() {
    const modal = document.getElementById('schedule-modal-overlay');
    if (modal) {
      modal.remove();
    }
  }

  async saveScheduledPrompt(promptId, existingScheduleId = null) {
    const scheduleTime = document.getElementById('schedule-time').value;
    const autoSubmit = document.getElementById('auto-submit').checked;
    
    if (!scheduleTime) {
      this.showToast('Please select a schedule time', 'error');
      return;
    }

    const scheduleDate = new Date(scheduleTime);
    const now = new Date();
    
    if (scheduleDate <= now) {
      this.showToast('Please select a future time', 'error');
      return;
    }

    const prompt = this.libraryData.prompts[promptId];
    if (!prompt) return;

    const timeoutMs = scheduleDate.getTime() - now.getTime();
    
    // Initialize scheduled array if needed
    if (!this.libraryData.scheduled) this.libraryData.scheduled = [];
    
    if (existingScheduleId) {
      // Update existing schedule
      const scheduleIndex = this.libraryData.scheduled.findIndex(s => s.id === existingScheduleId);
      if (scheduleIndex !== -1) {
        this.libraryData.scheduled[scheduleIndex] = {
          ...this.libraryData.scheduled[scheduleIndex],
          scheduleTime: scheduleDate.toISOString(),
          autoSubmit: autoSubmit,
          updated: now.toISOString()
        };
        this.showToast('Schedule updated successfully', 'success');
      } else {
        this.showToast('Schedule not found', 'error');
        return;
      }
    } else {
      // Create new schedule
      const scheduledPrompt = {
        id: 'sch_' + Date.now(),
        promptId: promptId,
        scheduleTime: scheduleDate.toISOString(),
        autoSubmit: autoSubmit,
        created: now.toISOString()
      };
      
      this.libraryData.scheduled.push(scheduledPrompt);
      this.showToast('Prompt scheduled successfully', 'success');
    }
    await this.saveLibraryData();

    // Ask service worker to handle the scheduling (so it persists)
    let scheduleIdToUse;
    if (existingScheduleId) {
      scheduleIdToUse = existingScheduleId;
    } else {
      // Get the ID of the newly created schedule
      scheduleIdToUse = this.libraryData.scheduled[this.libraryData.scheduled.length - 1]?.id;
    }
    
    chrome.runtime.sendMessage({
      type: 'SCHEDULE_PROMPT_EXECUTION',
      scheduleId: scheduleIdToUse,
      scheduleTime: scheduleDate.toISOString()
    });

    this.hideScheduleModal();
    this.showToast(`Prompt scheduled for ${scheduleDate.toLocaleString()}`, 'success');
    this.renderLibrary(); // Refresh to show the new scheduled prompt
  }

  startFolderEdit(folderId, nameElement) {
    const folder = this.libraryData.folders?.find(f => f.id === folderId);
    if (!folder) return;

    const currentName = folder.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'folder-name-edit';
    input.style.cssText = `
      background: white;
      border: 1px solid #3b82f6;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: inherit;
      font-weight: inherit;
      width: 100%;
      outline: none;
    `;

    // Replace the text with input
    nameElement.style.display = 'none';
    nameElement.parentNode.insertBefore(input, nameElement);
    input.focus();
    input.select();

    const finishEdit = async (save = false) => {
      const newName = input.value.trim();
      
      if (save && newName && newName !== currentName) {
        folder.name = newName;
        await this.saveLibraryData();
        this.showToast(`Folder renamed to "${newName}"`, 'success');
        this.renderLibrary();
      } else {
        // Cancel edit - restore original
        input.remove();
        nameElement.style.display = '';
      }
    };

    // Handle save/cancel
    input.addEventListener('blur', () => finishEdit(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEdit(false);
      }
    });
  }

  getScheduledPrompts() {
    return (this.libraryData.scheduled || [])
      .sort((a, b) => new Date(a.scheduleTime) - new Date(b.scheduleTime));
  }

  async deleteSchedule(scheduleId) {
    if (!this.libraryData.scheduled) return;

    const scheduleIndex = this.libraryData.scheduled.findIndex(s => s.id === scheduleId);
    if (scheduleIndex === -1) return;

    const schedule = this.libraryData.scheduled[scheduleIndex];
    const prompt = this.libraryData.prompts[schedule.promptId];
    
    if (confirm(`Cancel scheduled prompt "${prompt?.title || 'Unknown'}"?`)) {
      // Clear the Chrome alarm before removing from storage
      try {
        await chrome.alarms.clear(scheduleId);
        console.log(`🧹 Cleared alarm for deleted schedule: ${scheduleId}`);
      } catch (error) {
        console.warn('Failed to clear alarm:', error);
      }

      this.libraryData.scheduled.splice(scheduleIndex, 1);
      this.saveLibraryData();
      this.renderLibrary();
      this.showToast('Scheduled prompt cancelled', 'success');
    }
  }

  editSchedule(scheduleId) {
    const schedule = this.libraryData.scheduled?.find(s => s.id === scheduleId);
    if (!schedule) return;

    const prompt = this.libraryData.prompts[schedule.promptId];
    if (!prompt) return;

    // Use existing schedule modal but populate with current data
    this.schedulePrompt(schedule.promptId, schedule);
  }

  renderScheduledPrompt(schedule) {
    const prompt = this.libraryData.prompts[schedule.promptId];
    if (!prompt) return '';

    const scheduledTime = new Date(schedule.scheduleTime);
    const isActive = scheduledTime > new Date();
    const timeDisplay = scheduledTime.toLocaleString();
    const statusClass = isActive ? 'scheduled-active' : 'scheduled-expired';
    const preview = prompt.body.length > 35 ? prompt.body.substring(0, 35) + '...' : prompt.body;
    
    return `
      <div class="prompt-item ${statusClass}" data-schedule-id="${schedule.id}">
        <div class="scheduled-prompt-container">
          <button class="delete-prompt-btn" data-action="delete-schedule" data-schedule-id="${schedule.id}" title="Cancel scheduled prompt">🗑️</button>
          <div class="scheduled-prompt-info">
            <div class="prompt-title">${prompt.title}</div>
            <div class="prompt-preview">${preview}</div>
            <div class="schedule-time">${isActive ? 'Scheduled for' : 'Was scheduled for'}: ${timeDisplay}</div>
          </div>
          <div class="scheduled-prompt-actions">
            <button class="edit-prompt-btn" data-action="edit-schedule" data-schedule-id="${schedule.id}" title="Edit schedule">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.promptLibrary = new PromptLibrarySidePanel();
});