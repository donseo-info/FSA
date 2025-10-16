import { MultiSurfer } from './multi-surfer.js';
import fs from 'fs';
import path from 'path';

/**
 * Стартер для многопоточного серфинга
 * Управляет конфигурацией и выборкой параметров для multi-surfer.js
 */
class StarterMultiSurfer {
  constructor() {
    // Конфигурация параметров
    this.config = {
      // Диапазон количества сайтов для выбора
      min_sites: 4,
      max_sites: 8,
      
      // Диапазон времени просмотра страницы (секунды)
      min_view_time: 3,
      max_view_time: 8,
      
      // Диапазон количества кликов на сайт
      min_clicks: 0,
      max_clicks: 0,
      
      // Диапазон количества вкладок
      min_tabs: 3,
      max_tabs: 5,
      
      // Пауза между работой профилей (минуты)
      cooldown_minutes: 60,
      
      // Статичный профиль (пока, будет заменен на динамический выбор)
      profile: 'bot-779571040',
      
      // Путь к файлу с сайтами
      sites_file: 'configs/site-serf.txt',
      
      // Путь к файлу метаданных профилей
      profiles_metadata_file: 'profiles/metadata.json'
    };
    
    // Кэш сайтов (загружается один раз)
    this.sitesCache = null;
    
    // Кэш метаданных профилей (загружается один раз)
    this.profilesCache = null;
    
    // Статистика работы
    this.stats = {
      totalSessions: 0,
      profilesUsed: {},
      totalWorkTime: 0,
      startTime: null
    };
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
   * Загружает метаданные профилей из файла (один раз)
   */
  loadProfilesMetadata() {
    if (this.profilesCache) {
      return this.profilesCache;
    }

    try {
      const metadataPath = path.resolve(this.config.profiles_metadata_file);
      const content = fs.readFileSync(metadataPath, 'utf-8');
      
      this.profilesCache = JSON.parse(content);
      
      return this.profilesCache;
    } catch (error) {
      console.error(`❌ Ошибка загрузки метаданных профилей: ${error.message}`);
      return { profiles: {} };
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
   * Обновляет кэш метаданных профилей из файла
   */
  refreshProfilesMetadata() {
    try {
      const metadataPath = path.resolve(this.config.profiles_metadata_file);
      const content = fs.readFileSync(metadataPath, 'utf-8');
      
      this.profilesCache = JSON.parse(content);
      
      return this.profilesCache;
    } catch (error) {
      console.error(`❌ Ошибка обновления метаданных профилей: ${error.message}`);
      return { profiles: {} };
    }
  }

  /**
   * Выбирает профиль, который дольше всего был в простое и прошел cooldown
   */
  selectAvailableProfile() {
    // Обновляем кэш перед каждой проверкой
    const metadata = this.refreshProfilesMetadata();
    const profiles = metadata.profiles || {};
    
    if (Object.keys(profiles).length === 0) {
      console.error('❌ Нет доступных профилей');
      throw new Error('Нет профилей в метаданных');
    }

    const now = new Date();
    const cooldownMs = this.config.cooldown_minutes * 60 * 1000; // Конвертируем минуты в миллисекунды
    
    // Фильтруем профили, которые прошли cooldown
    const availableProfiles = [];
    
    for (const [profileName, profileData] of Object.entries(profiles)) {
      // Парсим время в локальном часовом поясе
      const lastUsed = new Date(profileData.lastUsed);
      const timeSinceLastUsed = now - lastUsed;
      const minutesSinceLastUsed = Math.round(timeSinceLastUsed / (60 * 1000));
      
      // Проверяем доступность профиля
      
      if (timeSinceLastUsed >= cooldownMs) {
        availableProfiles.push({
          name: profileName,
          lastUsed: lastUsed,
          timeSinceLastUsed: timeSinceLastUsed,
          deviceName: profileData.deviceName || 'Unknown'
        });
      }
    }
    
    if (availableProfiles.length === 0) {
      console.warn(`⚠️ Нет профилей, прошедших cooldown (${this.config.cooldown_minutes} минут)`);
      console.log('📋 Доступные профили и время до следующего использования:');
      
      for (const [profileName, profileData] of Object.entries(profiles)) {
        const lastUsed = new Date(profileData.lastUsed);
        const timeSinceLastUsed = now - lastUsed;
        const timeUntilAvailable = cooldownMs - timeSinceLastUsed;
        const minutesUntilAvailable = Math.ceil(timeUntilAvailable / (60 * 1000));
        
        console.log(`   ${profileName}: ${minutesUntilAvailable} минут до доступности`);
      }
      
      console.log('\n⏳ Ожидайте завершения cooldown перед следующим запуском');
      throw new Error(`Нет доступных профилей. Cooldown: ${this.config.cooldown_minutes} минут`);
    }
    
    // Сортируем по времени последнего использования (самый старый первым)
    availableProfiles.sort((a, b) => a.lastUsed - b.lastUsed);
    
    const selectedProfile = availableProfiles[0];
    
    // Форматируем время простоя в читаемый вид
    const formatTimeSinceLastUsed = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000);
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
    
    const timeSinceFormatted = formatTimeSinceLastUsed(selectedProfile.timeSinceLastUsed);
    
    console.log(`🎯 Профиль: ${selectedProfile.name} (${selectedProfile.deviceName}) - простоял ${timeSinceFormatted}`);
    
    return selectedProfile.name;
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
    
    this.stats.startTime = new Date();
    
    while (true) {
      this.stats.totalSessions++;
      const sessionStartTime = new Date();
      
      console.log(`\n🔄 === СЕССИЯ ${this.stats.totalSessions} ===`);
      console.log(`⏰ Время начала: ${sessionStartTime.toLocaleString()}`);
      
      try {
        // Генерируем случайные параметры
        const params = await this.generateRandomParams();
        
        console.log(`📊 Параметры: ${params.tabsCount} вкладок, ${params.sites.length} сайтов, ${params.clicksPerSite} кликов, ${params.viewTimeMin}-${params.viewTimeMax}с просмотр\n`);
        
        // Обновляем статистику профилей
        if (!this.stats.profilesUsed[params.profileName]) {
          this.stats.profilesUsed[params.profileName] = 0;
        }
        this.stats.profilesUsed[params.profileName]++;
        
        // Создаем экземпляр MultiSurfer
        const multiSurfer = new MultiSurfer(params.profileName, {
          tabsCount: params.tabsCount,
          sites: params.sites,
          clicksPerSite: params.clicksPerSite,
          viewTimeMin: params.viewTimeMin,
          viewTimeMax: params.viewTimeMax
        });
        
        // Запускаем серфинг
        await multiSurfer.startMultiSurfing();
        
        const sessionEndTime = new Date();
        const sessionDuration = Math.round((sessionEndTime - sessionStartTime) / 1000);
        this.stats.totalWorkTime += sessionDuration;
        
        console.log(`\n✅ Сессия ${this.stats.totalSessions} завершена успешно!`);
        console.log(`⏱️ Длительность сессии: ${sessionDuration} секунд`);
        console.log(`📊 Общее время работы: ${Math.round((sessionEndTime - this.stats.startTime) / 1000 / 60)} минут`);
        console.log(`🎯 Профиль использован ${this.stats.profilesUsed[params.profileName]} раз`);
        
        // Показываем статистику по профилям
        this.showProfileStats();
        
        // Небольшая пауза перед следующей сессией
        console.log('\n⏳ Пауза 5 секунд перед следующей сессией...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`\n❌ Ошибка в сессии ${this.stats.totalSessions}: ${error.message}`);
        console.log('⏳ Пауза 10 секунд перед повторной попыткой...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
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
