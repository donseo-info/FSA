import { MultiSurfer } from './multi-surfer.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import fs from 'fs';
import path from 'path';

/**
 * Стартер для многопоточного серфинга
 * Управляет конфигурацией и выборкой параметров для multi-surfer.js
 */
class StarterMultiSurfer {
  constructor() {
    // Генерируем уникальный порт для этого экземпляра
    this.instanceId = Math.floor(Math.random() * 10000);
    this.basePort = 9222 + this.instanceId;
    
    // Конфигурация параметров
    this.config = {
      // Диапазон количества сайтов для выбора
      min_sites: 8,
      max_sites: 10,
      
      // Диапазон времени просмотра страницы (секунды)
      min_view_time: 4,
      max_view_time: 6,
      
      // Диапазон количества кликов на сайт
      min_clicks: 0,
      max_clicks: 0,
      
      // Диапазон количества вкладок
      min_tabs: 4,
      max_tabs: 5,
      
      // Включить случайное переключение между вкладками
      enable_tab_switching: true,
      
      // Включить блокировку ресурсов
      enable_resource_blocking: true,
      
      // Показывать браузер (true = видно, false = скрыто)
      show_browser: true,
      
      // Пауза между работой профилей (минуты)
      cooldown_minutes: 60,
      
      // Максимальное количество сессий (0 = бесконечно)
      max_sessions: 0,
      
      // Фильтры для выбора профилей (опционально)
      profileFilters: null,  // Используем умную фильтрацию ProfileGenerator
      
      // Путь к файлу с сайтами
      sites_file: 'configs/site-serf.txt'
    };
    
    // Кэш сайтов (загружается один раз)
    this.sitesCache = null;
    
    // Инициализируем ProfileGenerator
    this.profileGenerator = new ProfileGenerator({
      chromePaths: [] // Будет загружено при первом использовании
    });
    
    // Статистика работы
    this.stats = {
      totalSessions: 0,
      profilesUsed: {},
      totalWorkTime: 0,
      startTime: null
    };
    
    // Применяем аргументы командной строки
    const cliOptions = this.parseCommandLineArgs();
    this.config = { ...this.config, ...cliOptions };
  }

  /**
   * Парсит аргументы командной строки
   */
  parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--proxy') {
        options.proxy = true;
      } else if (arg.startsWith('--cooldown=')) {
        const minutes = parseInt(arg.split('=')[1]);
        if (!isNaN(minutes) && minutes > 0) {
          options.cooldown_minutes = minutes;
        }
      } else if (arg.startsWith('--tabs=')) {
        const tabs = parseInt(arg.split('=')[1]);
        if (!isNaN(tabs) && tabs > 0) {
          options.min_tabs = tabs;
          options.max_tabs = tabs;
        }
      } else if (arg.startsWith('--sites=')) {
        const sites = parseInt(arg.split('=')[1]);
        if (!isNaN(sites) && sites > 0) {
          options.min_sites = sites;
          options.max_sites = sites;
        }
      } else if (arg === '--no-tab-switching') {
        options.enable_tab_switching = false;
      } else if (arg === '--no-resource-blocking') {
        options.enable_resource_blocking = false;
      } else if (arg.startsWith('--sessions=')) {
        const sessions = parseInt(arg.split('=')[1]);
        if (!isNaN(sessions) && sessions >= 0) {
          options.max_sessions = sessions;
        }
      }
    }
    
    return options;
  }

  /**
   * Загружает сайты из файла (один раз)
   */
  loadSites() {
    if (this.sitesCache) {
      return this.sitesCache;
    }

    try {
      const sitesPath = path.resolve(this.config.sites_file);
      const content = fs.readFileSync(sitesPath, 'utf-8');
      
      // Разбиваем на строки и фильтруем пустые
      this.sitesCache = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return this.sitesCache;
    } catch (error) {
      console.error(`❌ Ошибка загрузки файла сайтов: ${error.message}`);
      return [];
    }
  }

  /**
   * Выбирает случайное количество сайтов из списка
   */
  selectRandomSites() {
    const allSites = this.loadSites();
    if (allSites.length === 0) {
      console.error('❌ Нет доступных сайтов');
      return [];
    }

    // Случайное количество сайтов в диапазоне
    const sitesCount = this.getRandomInRange(this.config.min_sites, this.config.max_sites);
    
    // Выбираем случайные сайты
    const selectedSites = [];
    const availableSites = [...allSites]; // Копия массива
    
    for (let i = 0; i < Math.min(sitesCount, availableSites.length); i++) {
      const randomIndex = Math.floor(Math.random() * availableSites.length);
      selectedSites.push(availableSites.splice(randomIndex, 1)[0]);
    }
    
    return selectedSites;
  }

  /**
   * Генерирует случайное число в диапазоне
   */
  getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Выбирает профиль, который дольше всего был в простое и прошел cooldown
   */
  selectAvailableProfile() {
    // Используем умную фильтрацию ProfileGenerator
    try {
      const filters = {
        ...this.config.profileFilters,  // Пользовательские фильтры (если есть)
        cooldownMinutes: Math.max(this.config.cooldown_minutes, 10)  // Минимум 10 минут между сессиями профиля
        // createdAt и domainsCount фильтры - опционально, сейчас отключены
        // createdAt: { operator: '<', days: 7 },  // Раскомментируйте если нужен фильтр по возрасту
        // domainsCount: { operator: '<', count: 100 }  // Раскомментируйте если нужен фильтр по доменам
      };
      
      // Логируем применяемые фильтры
      console.log('\n🔍 Фильтры выбора профиля:');
      console.log(`   cooldownMinutes: ${filters.cooldownMinutes}`);
      if (filters.createdAt) {
        console.log(`   createdAt: ${JSON.stringify(filters.createdAt)}`);
      }
      if (filters.domainsCount) {
        console.log(`   domainsCount: ${JSON.stringify(filters.domainsCount)}`);
      }
      if (this.config.profileFilters) {
        Object.keys(this.config.profileFilters).forEach(key => {
          console.log(`   ${key}: ${JSON.stringify(this.config.profileFilters[key])}`);
        });
      }
      
      const selectedProfile = this.profileGenerator.selectProfile({
        filters,
        sortBy: 'lastUsed',
        sortOrder: 'asc'  // Самый старый (дольше не работал)
      });
      
      if (!selectedProfile) {
        console.warn(`\n⚠️ Нет профилей, соответствующих фильтрам!`);
        console.log('📋 Примененные фильтры:');
        Object.keys(filters).forEach(key => {
          console.log(`   - ${key}: ${JSON.stringify(filters[key])}`);
        });
        console.log(`   - Сортировка: по последнему использованию (самый старый)`);
        console.log('\n💡 Возможные причины:');
        if (filters.cooldownMinutes) {
          console.log(`   1. Все профили работали менее ${filters.cooldownMinutes} минут назад`);
        }
        if (filters.createdAt) {
          console.log(`   2. Все профили не соответствуют критерию возраста: ${JSON.stringify(filters.createdAt)}`);
        }
        if (filters.domainsCount) {
          console.log(`   3. Все профили не соответствуют критерию доменов: ${JSON.stringify(filters.domainsCount)}`);
        }
        console.log('\n⏳ Ожидайте завершения cooldown или создайте новые профили');
        throw new Error(`Нет доступных профилей`);
      }
      
      // Форматируем время простоя в читаемый вид
      const formatTimeSinceLastUsed = (lastUsedStr) => {
        if (!lastUsedStr) return 'никогда';
        
        const now = new Date();
        const lastUsed = new Date(lastUsedStr);
        const timeSinceLastUsed = now - lastUsed;
        
        const seconds = Math.floor(timeSinceLastUsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
          return `${days} дн. ${hours % 24} ч.`;
        } else if (hours > 0) {
          return `${hours} ч. ${minutes % 60} мин.`;
        } else if (minutes > 0) {
          return `${minutes} мин.`;
        } else {
          return `${seconds} сек.`;
        }
      };
      
      const timeSinceFormatted = formatTimeSinceLastUsed(selectedProfile.lastUsed);
      const domainsInfo = selectedProfile.cookies ? 
        `${selectedProfile.cookies.uniqueDomains || 0} доменов` : 
        '0 доменов';
      
      // Форматируем дату создания
      const createdAt = selectedProfile.createdAt ? new Date(selectedProfile.createdAt).toLocaleDateString('ru-RU') : 'неизвестно';
      const createdAtDays = selectedProfile.createdAt ? 
        Math.floor((new Date() - new Date(selectedProfile.createdAt)) / (1000 * 60 * 60 * 24)) : 0;
      
      console.log('\n🎯 ВЫБРАННЫЙ ПРОФИЛЬ:');
      console.log(`   Имя: ${selectedProfile.name}`);
      console.log(`   Устройство: ${selectedProfile.deviceName || 'Unknown'}`);
      console.log(`   Разрешение: ${selectedProfile.resolution ? `${selectedProfile.resolution.width}x${selectedProfile.resolution.height}` : 'неизвестно'}`);
      console.log(`   Куки: ${domainsInfo}`);
      console.log(`   Создан: ${createdAt} (${createdAtDays} дней назад)`);
      console.log(`   Последнее использование: ${selectedProfile.lastUsed || 'никогда'}`);
      console.log(`   Время простоя: ${timeSinceFormatted}`);
      
      return selectedProfile.name;
      
    } catch (error) {
      console.error('❌ Ошибка выбора профиля:', error.message);
      throw error;
    }
  }

  /**
   * Ждет освобождения профиля с повторными попытками
   */
  async waitForAvailableProfile() {
    const maxAttempts = 1000; // Максимум 1000 попыток (1000 минут)
    let attempts = 0;
    
    console.log(`⏳ Ожидание доступного профиля (проверка каждую минуту)...`);
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const selectedProfile = this.selectAvailableProfile();
        console.log(`✅ Профиль найден с попытки ${attempts}`);
        return selectedProfile;
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error(`❌ Превышено максимальное количество попыток (${maxAttempts})`);
          throw new Error(`Не удалось найти доступный профиль за ${maxAttempts} минут`);
        }
        
        console.log(`⏳ Попытка ${attempts}/${maxAttempts} - ждем 1 минуту...`);
        
        // Ждем 1 минуту (60 секунд)
        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
      }
    }
  }

  /**
   * Генерирует случайные параметры для multi-surfer
   */
  async generateRandomParams() {
    // Ждем доступный профиль
    const selectedProfile = await this.waitForAvailableProfile();
    
    const params = {
      profileName: selectedProfile,
      tabsCount: this.getRandomInRange(this.config.min_tabs, this.config.max_tabs),
      clicksPerSite: this.getRandomInRange(this.config.min_clicks, this.config.max_clicks),
      viewTimeMin: this.getRandomInRange(this.config.min_view_time, this.config.max_view_time),
      viewTimeMax: this.getRandomInRange(this.config.min_view_time, this.config.max_view_time),
      sites: this.selectRandomSites()
    };

    // Убеждаемся что viewTimeMax >= viewTimeMin
    if (params.viewTimeMax < params.viewTimeMin) {
      params.viewTimeMax = params.viewTimeMin;
    }

    return params;
  }

  /**
   * Запускает многопоточный серфинг с случайными параметрами
   */
  async startSurfing() {
    console.log('🚀 Запуск Starter Multi-Surfer в бесконечном режиме...\n');
    
    // Показываем примененные опции
    if (this.config.proxy) {
      console.log('🔗 Прокси: включен');
    }
    if (this.config.cooldown_minutes !== 60) {
      console.log(`⏰ Cooldown: ${this.config.cooldown_minutes} минут`);
    }
    if (!this.config.enable_tab_switching) {
      console.log('🔄 Переключение вкладок: отключено');
    }
    if (!this.config.enable_resource_blocking) {
      console.log('🛡️ Блокировка ресурсов: отключена');
    }
    if (this.config.max_sessions > 0) {
      console.log(`🔢 Максимум сессий: ${this.config.max_sessions}`);
    } else {
      console.log('♾️ Режим: бесконечный');
    }
    if (this.config.min_tabs === this.config.max_tabs) {
      console.log(`📑 Вкладки: ${this.config.min_tabs}`);
    }
    if (this.config.min_sites === this.config.max_sites) {
      console.log(`🌐 Сайты: ${this.config.min_sites}`);
    }
    console.log('');
    
    this.stats.startTime = new Date();
    
    // Определяем максимальное количество сессий
    const maxAttempts = this.config.max_sessions || Infinity; // 0 = бесконечно
    let consecutiveErrors = 0;
    let lastConsoleClear = Date.now();
    
    while (this.stats.totalSessions < maxAttempts) {
      this.stats.totalSessions++;
      const sessionStartTime = new Date();
      
      // Периодическая очистка консоли (каждые 5 минут)
      const now = Date.now();
      if (now - lastConsoleClear > 5 * 60 * 1000) { // 5 минут
        console.clear();
        console.log('🧹 Консоль очищена для лучшей читаемости');
        console.log(`📊 Статистика: ${this.stats.totalSessions} сессий, ${Math.round((now - this.stats.startTime) / 1000 / 60)} минут работы`);
        lastConsoleClear = now;
        
        // Сохраняем статистику в файл
        this.saveStatsToFile();
      }
      
      console.log(`\n🔄 === СЕССИЯ ${this.stats.totalSessions} ===`);
      console.log(`⏰ Время начала: ${sessionStartTime.toLocaleString()}`);
      
      try {
        // Генерируем случайные параметры
        const params = await this.generateRandomParams();
        
        console.log(`📊 Параметры: ${params.tabsCount} вкладок, ${params.sites.length} сайтов, ${params.clicksPerSite} кликов, ${params.viewTimeMin}-${params.viewTimeMax}с просмотр`);
        console.log(`🔄 Переключение вкладок: ${this.config.enable_tab_switching ? 'включено' : 'отключено'}`);
        console.log(`🛡️ Блокировка ресурсов: ${this.config.enable_resource_blocking ? 'включена' : 'отключена'}`);
        console.log(`🔌 Порт: ${this.basePort} (ID: ${this.instanceId})\n`);
        
        // Обновляем статистику профилей
        if (!this.stats.profilesUsed[params.profileName]) {
          this.stats.profilesUsed[params.profileName] = 0;
        }
        this.stats.profilesUsed[params.profileName]++;
        
        // Создаем экземпляр MultiSurfer
        const multiSurferOptions = {
          tabsCount: params.tabsCount,
          sites: params.sites,
          clicksPerSite: params.clicksPerSite,
          viewTimeMin: params.viewTimeMin,
          viewTimeMax: params.viewTimeMax,
          enableTabSwitching: this.config.enable_tab_switching,  // Передаем настройку переключения вкладок
          enableResourceBlocking: this.config.enable_resource_blocking,  // Передаем настройку блокировки ресурсов
          showBrowser: this.config.show_browser,  // Передаем настройку видимости браузера
          port: this.basePort  // Передаем уникальный порт
        };
        
        // Добавляем прокси если указан флаг
        if (this.config.proxy) {
          multiSurferOptions.proxy = true;
        }
        
        const multiSurfer = new MultiSurfer(params.profileName, multiSurferOptions);
        
        try {
          // Запускаем серфинг
          await multiSurfer.startMultiSurfing();
        } finally {
          // Принудительно закрываем браузер при любом исходе
          try {
            if (multiSurfer.browserController) {
              await multiSurfer.browserController.close();
            }
          } catch (closeError) {
            console.warn('⚠️ Ошибка при закрытии браузера:', closeError.message);
          }
        }
        
        const sessionEndTime = new Date();
        const sessionDuration = Math.round((sessionEndTime - sessionStartTime) / 1000);
        this.stats.totalWorkTime += sessionDuration;
        
        // Обновляем время последнего использования профиля ПОСЛЕ завершения работы
        this.profileGenerator.updateLastUsed(params.profileName);
        
        console.log(`\n✅ Сессия ${this.stats.totalSessions} завершена успешно!`);
        console.log(`⏱️ Длительность сессии: ${sessionDuration} секунд`);
        console.log(`📊 Общее время работы: ${Math.round((sessionEndTime - this.stats.startTime) / 1000 / 60)} минут`);
        console.log(`🎯 Профиль использован ${this.stats.profilesUsed[params.profileName]} раз`);
        
        // Показываем статистику по профилям
        this.showProfileStats();
        
        // Небольшая пауза перед следующей сессией
        console.log('\n⏳ Пауза 5 секунд перед следующей сессией...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Сбрасываем счетчик ошибок при успехе
        consecutiveErrors = 0;
        
      } catch (error) {
        consecutiveErrors++;
        console.error(`\n❌ Ошибка в сессии ${this.stats.totalSessions}: ${error.message}`);
        console.error(`🔢 Подряд ошибок: ${consecutiveErrors}`);
        
        // Если слишком много ошибок подряд - останавливаемся
        if (consecutiveErrors >= 3) {
          console.error(`\n🛑 Слишком много ошибок подряд (${consecutiveErrors}). Останавливаем выполнение.`);
          break;
        }
        
        console.log('⏳ Пауза 10 секунд перед повторной попыткой...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    // Финальная статистика
    console.log(`\n🏁 Работа завершена!`);
    console.log(`📊 Всего сессий: ${this.stats.totalSessions}`);
    console.log(`⏱️ Общее время работы: ${Math.round((new Date() - this.stats.startTime) / 1000 / 60)} минут`);
    this.showProfileStats();
    
    // Сохраняем статистику в файл
    this.saveStatsToFile();
  }

  /**
   * Показывает статистику использования профилей
   */
  showProfileStats() {
    console.log('\n📊 Статистика по профилям:');
    const sortedProfiles = Object.entries(this.stats.profilesUsed)
      .sort(([,a], [,b]) => b - a);
    
    for (const [profileName, count] of sortedProfiles) {
      console.log(`   ${profileName}: ${count} сессий`);
    }
    console.log(`📈 Всего сессий: ${this.stats.totalSessions}`);
    console.log(`⏱️ Общее время работы: ${Math.round(this.stats.totalWorkTime / 60)} минут\n`);
  }

  /**
   * Сохраняет статистику в файл
   */
  saveStatsToFile() {
    // Создаем уникальное имя файла на основе времени запуска
    if (!this.stats.startTime) return;
    
    const startTimeStr = this.stats.startTime.toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
    const statsFile = `logs/statistics_${startTimeStr}.json`;
    
    // Создаем директорию если её нет
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const now = new Date();
    
    const stats = {
      sessionId: startTimeStr,
      sessionStartTime: this.stats.startTime.toISOString(),
      lastUpdateTime: now.toISOString(),
      totalProfiles: Object.keys(this.stats.profilesUsed).length,
      totalSessions: this.stats.totalSessions,
      totalWorkTimeMinutes: Math.round(this.stats.totalWorkTime / 60),
      uptimeMinutes: Math.round((now - this.stats.startTime) / 1000 / 60),
      avgSitesPerProfile: this.stats.totalSessions > 0 ? 
        Math.round((this.config.min_sites + this.config.max_sites) / 2) : 0,
      profilesUsage: this.stats.profilesUsed,
      sessionSummary: {
        totalCompletedSessions: this.stats.totalSessions,
        avgSessionDuration: this.stats.totalSessions > 0 ? 
          Math.round(this.stats.totalWorkTime / this.stats.totalSessions) : 0,
        mostUsedProfile: Object.entries(this.stats.profilesUsed)
          .sort(([,a], [,b]) => b - a)[0] || null
      }
    };
    
    try {
      fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf-8');
      console.log(`💾 Статистика сохранена в ${statsFile}`);
    } catch (error) {
      console.error('⚠️ Ошибка сохранения статистики:', error.message);
    }
  }

  /**
   * Обновляет конфигурацию
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Конфигурация обновлена');
  }

  /**
   * Показывает текущую конфигурацию
   */
  showConfig() {
    console.log('⚙️ Текущая конфигурация:');
    console.log(JSON.stringify(this.config, null, 2));
  }
}

// Запуск если файл вызван напрямую
if (import.meta.url.endsWith('starter-multi-surfer.js')) {
  const starter = new StarterMultiSurfer();
  
  // Запускаем серфинг
  starter.startSurfing().catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
}

export { StarterMultiSurfer };
