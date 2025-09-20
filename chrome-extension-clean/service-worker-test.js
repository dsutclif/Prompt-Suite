// Minimal test service worker
console.log('🚀 Service worker starting...');

chrome.action.onClicked.addListener(async (tab) => {
  console.log('🔥 Extension icon clicked!', tab.id);
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('✅ Side panel opened successfully');
  } catch (error) {
    console.error('❌ Error opening side panel:', error);
  }
});

console.log('✅ Service worker loaded and action listener registered');