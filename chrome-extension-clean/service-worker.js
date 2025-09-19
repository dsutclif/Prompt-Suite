console.log('🔥 ROOT SERVICE WORKER LOADED');

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('🌍 EXTERNAL MESSAGE:', message, 'from:', sender.origin);
  sendResponse({success: true, message: 'Hello from extension!'});
});

console.log('🔥 EXTERNAL HANDLER REGISTERED');