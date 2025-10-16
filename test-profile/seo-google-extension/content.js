
(function() {
  'use strict';
  
  console.log('[Test SEO Plugin] Content script loaded');
  
  // Имитируем функциональность SEO плагина
  const seoPlugin = {
    name: 'Test SEO Plugin',
    version: '2.0.0',
    active: true,
    
    // Анализ SEO метрик
    analyzeSEO: function() {
      const metrics = {
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
        headings: {
          h1: document.querySelectorAll('h1').length,
          h2: document.querySelectorAll('h2').length,
          h3: document.querySelectorAll('h3').length
        },
        images: document.querySelectorAll('img').length,
        links: document.querySelectorAll('a').length,
        wordCount: document.body.innerText.split(' ').length
      };
      
      console.log('[Test SEO Plugin] SEO Analysis:', metrics);
      return metrics;
    },
    
    // Проверка скорости загрузки
    checkPageSpeed: function() {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      console.log('[Test SEO Plugin] Page load time:', loadTime + 'ms');
      return loadTime;
    },
    
    // Анализ ключевых слов
    analyzeKeywords: function() {
      const text = document.body.innerText.toLowerCase();
      const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      const words = text.split(/\s+/).filter(word => 
        word.length > 3 && !commonWords.includes(word)
      );
      
      const wordCount = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      
      const topKeywords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
        
      console.log('[Test SEO Plugin] Top keywords:', topKeywords);
      return topKeywords;
    }
  };
  
  // Запускаем анализ при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        seoPlugin.analyzeSEO();
        seoPlugin.checkPageSpeed();
        seoPlugin.analyzeKeywords();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      seoPlugin.analyzeSEO();
      seoPlugin.checkPageSpeed();
      seoPlugin.analyzeKeywords();
    }, 1000);
  }
  
  // Добавляем плагин в глобальную область
  window.seoGooglePlugin = seoPlugin;
  
  // Имитируем события плагина
  const event = new CustomEvent('seoPluginLoaded', {
    detail: { plugin: seoPlugin }
  });
  document.dispatchEvent(event);
  
  console.log('[Test SEO Plugin] Plugin initialized successfully');
  
})();
    