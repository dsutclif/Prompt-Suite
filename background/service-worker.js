// Minimal test service worker - no external dependencies
console.log('🚀 SERVICE WORKER STARTING...');

// Basic functionality test
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🔥 EXTENSION ICON CLICKED! Tab ID:', tab.id);
  
  try {
    // Try to open side panel
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('✅ Side panel opened successfully');
  } catch (error) {
    console.error('❌ Side panel error:', error);
    
    // Fallback: inject a message into the page
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const div = document.createElement('div');
          div.style.cssText = 'position:fixed;top:10px;right:10px;background:#22c55e;color:white;padding:12px;z-index:9999;border-radius:8px;font-family:sans-serif;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
          div.textContent = '✅ Prompt Suite Extension Working!';
          document.body.appendChild(div);
          setTimeout(() => div.remove(), 4000);
        }
      });
      console.log('✅ Injected success message into page');
    } catch (scriptError) {
      console.error('❌ Script injection failed:', scriptError);
    }
  }
});

console.log('✅ SERVICE WORKER LOADED SUCCESSFULLY');