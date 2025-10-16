import fs from 'fs';
import path from 'path';

/**
 * Подключение плагина "Seo Google" через Chrome Extension
 * Создает расширение для имитации SEO плагина
 */
class SeoGoogleSpoof {
  constructor(options = {}) {
    this.profilePath = options.profilePath || './profile';
    this.extensionPath = path.join(this.profilePath, 'seo-google-extension');
    this.pluginName = options.pluginName || 'Seo Google';
    this.version = options.version || '1.0.0';
  }

  /**
   * Создает Chrome расширение для имитации SEO плагина
   */
  createExtension() {
    if (!fs.existsSync(this.extensionPath)) {
      fs.mkdirSync(this.extensionPath, { recursive: true });
    }

    // manifest.json
    const manifest = {
      manifest_version: 3,
      name: this.pluginName,
      version: this.version,
      description: "SEO optimization plugin for Google search",
      permissions: ["storage", "tabs", "activeTab"],
      host_permissions: ["<all_urls>"],
      content_scripts: [{
        matches: ["<all_urls>"],
        js: ["content.js"],
        run_at: "document_start",
        all_frames: true,
        match_about_blank: true,
        world: "MAIN"
      }],
      background: {
        service_worker: "background.js"
      },
      action: {
        default_popup: "popup.html",
        default_title: this.pluginName
      },
      icons: {
        "16": "icon16.png",
        "48": "icon48.png",
        "128": "icon128.png"
      }
    };

    fs.writeFileSync(
      path.join(this.extensionPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // content.js - основной скрипт плагина
    const contentScript = this.getContentScript();
    
    fs.writeFileSync(
      path.join(this.extensionPath, 'content.js'),
      contentScript
    );

    // background.js - фоновый скрипт
    const backgroundScript = this.getBackgroundScript();
    
    fs.writeFileSync(
      path.join(this.extensionPath, 'background.js'),
      backgroundScript
    );

    // popup.html - интерфейс плагина
    const popupHtml = this.getPopupHtml();
    
    fs.writeFileSync(
      path.join(this.extensionPath, 'popup.html'),
      popupHtml
    );

    // Создаем простые иконки (заглушки)
    this.createIcons();

    console.log(`🔍 SEO Google Extension: ${this.pluginName} v${this.version}`);
    
    return this.extensionPath;
  }

  /**
   * Генерирует content.js для SEO плагина
   */
  getContentScript() {
    return `
(function() {
  'use strict';
  
  console.log('[${this.pluginName}] Content script loaded');
  
  // Имитируем функциональность SEO плагина
  const seoPlugin = {
    name: '${this.pluginName}',
    version: '${this.version}',
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
      
      console.log('[${this.pluginName}] SEO Analysis:', metrics);
      return metrics;
    },
    
    // Проверка скорости загрузки
    checkPageSpeed: function() {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      console.log('[${this.pluginName}] Page load time:', loadTime + 'ms');
      return loadTime;
    },
    
    // Анализ ключевых слов
    analyzeKeywords: function() {
      const text = document.body.innerText.toLowerCase();
      const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      const words = text.split(/\\s+/).filter(word => 
        word.length > 3 && !commonWords.includes(word)
      );
      
      const wordCount = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      
      const topKeywords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
        
      console.log('[${this.pluginName}] Top keywords:', topKeywords);
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
  
  console.log('[${this.pluginName}] Plugin initialized successfully');
  
})();
    `;
  }

  /**
   * Генерирует background.js для фонового скрипта
   */
  getBackgroundScript() {
    return `
// Background script for ${this.pluginName}
console.log('[${this.pluginName}] Background script loaded');

// Обработка установки расширения
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[${this.pluginName}] Extension installed:', details.reason);
  
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
  console.log('[${this.pluginName}] Message received:', request);
  
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
  console.log('[${this.pluginName}] Background check');
}, 30000);
    `;
  }

  /**
   * Генерирует popup.html для интерфейса плагина
   */
  getPopupHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 300px;
      padding: 15px;
      font-family: Arial, sans-serif;
      margin: 0;
    }
    .header {
      text-align: center;
      margin-bottom: 15px;
    }
    .logo {
      font-size: 18px;
      font-weight: bold;
      color: #4285f4;
    }
    .status {
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
    .active {
      background-color: #e8f5e8;
      color: #2e7d32;
    }
    .button {
      width: 100%;
      padding: 8px;
      margin: 5px 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .primary {
      background-color: #4285f4;
      color: white;
    }
    .secondary {
      background-color: #f1f3f4;
      color: #5f6368;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${this.pluginName}</div>
    <div>v${this.version}</div>
  </div>
  
  <div class="status active">
    ✅ Plugin Active
  </div>
  
  <button class="button primary" id="analyzeBtn">
    Analyze Current Page
  </button>
  
  <button class="button secondary" id="settingsBtn">
    Settings
  </button>
  
  <div id="results" style="margin-top: 15px; font-size: 12px;">
    Click "Analyze" to see SEO metrics
  </div>
  
  <script>
    document.getElementById('analyzeBtn').addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'analyze'}, (response) => {
          document.getElementById('results').innerHTML = 
            'SEO Score: ' + (response?.score || 'N/A') + '<br>' +
            'Page: ' + tabs[0].title;
        });
      });
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  </script>
</body>
</html>
    `;
  }

  /**
   * Создает простые иконки (заглушки)
   */
  createIcons() {
    // Создаем простые SVG иконки
    const iconSvg = `
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#4285f4" rx="20"/>
  <text x="64" y="75" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="white">SEO</text>
</svg>`;

    // Сохраняем SVG как PNG (заглушка)
    const iconPath = path.join(this.extensionPath, 'icon128.png');
    fs.writeFileSync(iconPath, Buffer.from(iconSvg));
    
    // Копируем для других размеров
    fs.copyFileSync(iconPath, path.join(this.extensionPath, 'icon48.png'));
    fs.copyFileSync(iconPath, path.join(this.extensionPath, 'icon16.png'));
  }

  /**
   * Возвращает путь к расширению
   */
  getExtensionPath() {
    return this.extensionPath;
  }

  /**
   * Применяет спуф (для совместимости с другими спуфами)
   */
  async apply(page) {
    // Этот метод не используется, так как плагин загружается как расширение
    console.log(`🔍 ${this.pluginName}: Plugin loaded as Chrome extension`);
  }
}

export { SeoGoogleSpoof };
