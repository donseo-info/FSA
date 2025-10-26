import { MultiSurfer } from './multi-surfer.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import fs from 'fs';
import path from 'path';

/**
 * Тест для проверки палевности на browserscan.net
 */
class BrowserscanTest {
  constructor() {
    // Генерируем уникальный порт для этого экземпляра
    this.instanceId = Math.floor(Math.random() * 10000);
    this.basePort = 9222 + this.instanceId;
    
    // Конфигурация - копируем из starter-multi-surfer.js
    this.config = {
      enable_tab_switching: false,  // Без переключения вкладок
      enable_resource_blocking: false,  // Без блокировки ресурсов
      show_browser: true,  // Показываем браузер для проверки
      cooldown_minutes: 10,
      max_sessions: 1,  // Только 1 сессия
      min_tabs: 1,
      max_tabs: 1,
      min_sites: 1,
      max_sites: 1,
      min_clicks: 0,
      max_clicks: 0,
      min_view_time: 60,  // 60 секунд просмотра
      max_view_time: 120  // 120 секунд просмотра
    };
    
    // Инициализируем ProfileGenerator
    this.profileGenerator = new ProfileGenerator({
      chromePaths: []
    });
    
    // Статистика
    this.stats = {
      totalSessions: 0,
      profilesUsed: {},
      totalWorkTime: 0,
      startTime: null
    };
  }

  /**
   * Выбирает случайный профиль
   */
  selectRandomProfile() {
    try {
      const allProfiles = this.profileGenerator.getAllProfiles();
      if (allProfiles.length === 0) {
        throw new Error('Нет доступных профилей');
      }
      
      const randomProfile = allProfiles[Math.floor(Math.random() * allProfiles.length)];
      return randomProfile.name;
    } catch (error) {
      console.error('❌ Ошибка выбора профиля:', error.message);
      throw error;
    }
  }

  /**
   * Запускает тест на browserscan.net
   */
  async startTest() {
    console.log('🚀 Запуск теста на browserscan.net...\n');
    
    this.stats.startTime = new Date();
    this.stats.totalSessions = 1;
    
    try {
      // Выбираем случайный профиль
      const profileName = this.selectRandomProfile();
      console.log(`📋 Выбран профиль: ${profileName}`);
      console.log(`🔌 Порт: ${this.basePort}\n`);
      
      // Создаем экземпляр MultiSurfer для browserscan.net
      const multiSurferOptions = {
        tabsCount: 1,
        sites: ['https://www.browserscan.net/'],  // Только browserscan.net
        clicksPerSite: 0,
        viewTimeMin: 60,  // Минимум 60 секунд
        viewTimeMax: 120, // Максимум 120 секунд
        enableTabSwitching: false,  // Без переключения вкладок
        enableResourceBlocking: false,  // Без блокировки ресурсов
        showBrowser: this.config.show_browser,  // Показываем браузер
        port: this.basePort
      };
      
      const multiSurfer = new MultiSurfer(profileName, multiSurferOptions);
      
      console.log('🌐 Запускаем браузер и открываем browserscan.net...\n');
      console.log('⏰ Браузер останется открытым для проверки палевности');
      console.log('💡 Проверьте: navigator.webdriver, chrome.runtime, Canvas fingerprint, WebGL fingerprint\n');
      
      // Запускаем серфинг
      await multiSurfer.startMultiSurfing();
      
      console.log('\n✅ Тест завершен!');
      console.log('🔍 Проверьте результаты на browserscan.net');
      console.log('⚠️ Браузер останется открытым для анализа');
      
    } catch (error) {
      console.error('❌ Ошибка теста:', error.message);
      console.error(error);
    }
  }
}

// Запуск теста
if (import.meta.url.endsWith('test-browserscan.js')) {
  const test = new BrowserscanTest();
  test.startTest().catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
}

export { BrowserscanTest };

