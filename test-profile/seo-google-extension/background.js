
// Background script for Test SEO Plugin
console.log('[Test SEO Plugin] Background script loaded');

// Обработка установки расширения
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Test SEO Plugin] Extension installed:', details.reason);
  
  // Сохраняем настройки по умолчанию
  chrome.storage.sync.set({
    seoEnabled: true,
    autoAnalyze: true,
    showNotifications: true,
    lastUpdate: Date.now()
  });
});

// Обработка сообщений от content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Test SEO Plugin] Message received:', request);
  
  if (request.action === 'analyzeSEO') {
    // Имитируем анализ SEO
    sendResponse({
      success: true,
      data: {
        score: Math.floor(Math.random() * 40) + 60, // 60-100
        recommendations: [
          'Optimize meta description',
          'Add more internal links',
          'Improve page loading speed'
        ]
      }
    });
  }
  
  return true;
});

// Периодическая проверка обновлений
setInterval(() => {
  console.log('[Test SEO Plugin] Background check');
}, 30000);
    