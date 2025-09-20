// Basic service worker test - no sidePanel API
console.log('🚀 BASIC SERVICE WORKER STARTING...');

// Test if Chrome APIs are available
if (typeof chrome !== 'undefined') {
  console.log('✅ Chrome APIs are available');
  
  if (chrome.action) {
    console.log('✅ chrome.action API is available');
    
    chrome.action.onClicked.addListener((tab) => {
      console.log('🔥 EXTENSION ICON CLICKED! Tab ID:', tab.id);
      
      // Instead of opening side panel, just create a notification or popup
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Prompt Suite',
          message: 'Extension clicked! Service worker is working.'
        });
        console.log('✅ Notification sent');
      } else {
        console.log('ℹ️ Notifications API not available, but click detected');
      }
      
      // Try to inject a simple alert into the page
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const div = document.createElement('div');
          div.style.cssText = 'position:fixed;top:10px;right:10px;background:green;color:white;padding:10px;z-index:9999;border-radius:5px;';
          div.textContent = 'Prompt Suite Extension Working!';
          document.body.appendChild(div);
          setTimeout(() => div.remove(), 3000);
        }
      }).catch(error => console.log('Script injection failed:', error));
    });
    
    console.log('✅ Action click listener registered');
  } else {
    console.error('❌ chrome.action API not available');
  }
} else {
  console.error('❌ Chrome APIs not available');
}

console.log('✅ BASIC SERVICE WORKER INITIALIZATION COMPLETE');