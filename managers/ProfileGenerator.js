import fs from 'fs';
import path from 'path';
import { getRandomDevice } from '../configs/devices.js';
import { PluginManager } from '../utils/PluginManager.js';

/**
 * Генератор профилей браузера
 */
class ProfileGenerator {
  constructor(options = {}) {
    this.profilesDir = path.resolve('./profiles');
    this.metadataFile = path.join(this.profilesDir, 'metadata.json');
    
    // Chrome paths должны быть переданы через options
    this.chromePaths = options.chromePaths || [];
    
    this.ensureProfilesDir();
    this.metadata = this.loadMetadata();
    this.pluginManager = new PluginManager();
  }

  /**
   * Создает директорию для профилей
   */
  ensureProfilesDir() {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  /**
   * Загружает метаданные профилей
   */
  loadMetadata() {
    if (fs.existsSync(this.metadataFile)) {
      try {
        const data = fs.readFileSync(this.metadataFile, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('⚠️ Ошибка загрузки metadata.json, создаем новый');
        return {};
      }
    }
    return {};
  }

  /**
   * Сохраняет метаданные
   */
  saveMetadata() {
    try {
      fs.writeFileSync(
        this.metadataFile,
        JSON.stringify(this.metadata, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('❌ Ошибка сохранения metadata.json:', error.message);
    }
  }

  /**
   * Генерирует конфигурацию на основе случайного устройства
   */
  generateRandomConfig() {
    // Получаем случайное устройство с учетом весов GPU, железа, разрешений
    const device = getRandomDevice();
    
    // Выбираем случайный Chrome
    const chromeConfig = this.chromePaths[
      Math.floor(Math.random() * this.chromePaths.length)
    ];
    
    const chromePath = chromeConfig.path;
    const chromeVersion = chromeConfig.versions[
      Math.floor(Math.random() * chromeConfig.versions.length)
    ];
    
    // Генерируем случайные плагины (0-3 плагина)
    const pluginCount = Math.floor(Math.random() * 4); // 0, 1, 2 или 3 плагина
    const randomPlugins = this.pluginManager.getRandomPlugins(pluginCount);
    
    return {
      // Информация об устройстве
      deviceName: device.name,
      deviceCategory: device.category,
      
      // Параметры из устройства
      resolution: device.resolution,
      hardware: device.hardware,
      locale: device.locale,
      languages: device.languages,
      acceptLanguage: device.acceptLanguage,
      
      // WebGL конфигурация (уже сгенерирована в device)
      webgl: device.webgl,
      
      // Chrome конфигурация
      chromePath,
      chromeVersion,
      
      // Случайные плагины
      plugins: randomPlugins
    };
  }

  /**
   * Создает новый профиль
   */
  createProfile(profileName) {
    const profilePath = path.join(this.profilesDir, profileName);
    
    if (fs.existsSync(profilePath)) {
      throw new Error(`Профиль ${profileName} уже существует`);
    }
    
    // Генерируем конфигурацию на основе реального устройства
    const config = this.generateRandomConfig();
    
    // Создаем директорию профиля
    fs.mkdirSync(profilePath, { recursive: true });
    
    // Инициализируем секцию profiles, если её нет
    if (!this.metadata.profiles) {
      this.metadata.profiles = {};
    }
    
    // Сохраняем метаданные в секцию profiles
    this.metadata.profiles[profileName] = {
      name: profileName,
      ...config,
      createdAt: new Date().toISOString(),
      lastUsed: null, // Будет установлено при первом использовании в локальном формате
      cookies: {
        totalCookies: 0,
        uniqueDomains: 0,
        lastUpdated: new Date().toISOString()
      },
      // Домены, которые профиль уже посещал через поиск
      visitedDomains: [],
      // Метки (теги) для фильтрации профилей
      tags: []
    };
    
    this.saveMetadata();
    
    return this.metadata.profiles[profileName];
  }

  /**
   * Получает или создает профиль
   */
  getOrCreateProfile(profileName) {
    if (this.profileExists(profileName)) {
      return this.getProfileConfig(profileName);
    } else {
      return this.createProfile(profileName);
    }
  }

  /**
   * Получает конфигурацию профиля
   */
  getProfileConfig(profileName) {
    if (!this.metadata.profiles || !this.metadata.profiles[profileName]) {
      throw new Error(`Профиль ${profileName} не найден`);
    }
    
    // Возвращаем конфигурацию БЕЗ обновления lastUsed
    // lastUsed обновляется в starter-multi-surfer.js после выбора профиля
    return this.metadata.profiles[profileName];
  }
  
  /**
   * Обновляет время последнего использования профиля
   */
  updateLastUsed(profileName) {
    if (!this.metadata.profiles || !this.metadata.profiles[profileName]) {
      throw new Error(`Профиль ${profileName} не найден`);
    }
    
    this.metadata.profiles[profileName].lastUsed = new Date().toString();
    this.saveMetadata();
  }

  /**
   * Проверяет существование профиля
   */
  profileExists(profileName) {
    return !!(this.metadata.profiles && this.metadata.profiles[profileName]);
  }

  /**
   * Удаляет профиль
   */
  deleteProfile(profileName) {
    if (!this.profileExists(profileName)) {
      throw new Error(`Профиль ${profileName} не найден`);
    }
    
    const profilePath = path.join(this.profilesDir, profileName);
    
    // Удаляем директорию
    if (fs.existsSync(profilePath)) {
      fs.rmSync(profilePath, { recursive: true, force: true });
    }
    
    // Удаляем из метаданных
    if (this.metadata.profiles) {
      delete this.metadata.profiles[profileName];
    }
    this.saveMetadata();
    
    console.log(`🗑️ Профиль удален: ${profileName}`);
  }

  /**
   * Возвращает список всех профилей
   */
  getAllProfiles() {
    if (!this.metadata.profiles) {
      return [];
    }
    return Object.keys(this.metadata.profiles).map(name => ({
      name,
      ...this.metadata.profiles[name]
    }));
  }

  /**
   * Добавляет домен в список посещенных доменов профиля
   */
  addVisitedDomain(profileName, domain) {
    if (!this.metadata.profiles || !this.metadata.profiles[profileName]) {
      throw new Error(`Профиль ${profileName} не найден`);
    }
    
    const profile = this.metadata.profiles[profileName];
    
    // Инициализируем visitedDomains, если его нет (для старых профилей)
    if (!profile.visitedDomains) {
      profile.visitedDomains = [];
    }
    
    // Добавляем домен, если его еще нет
    if (!profile.visitedDomains.includes(domain)) {
      profile.visitedDomains.push(domain);
      this.saveMetadata();
    }
  }

  /**
   * Добавляет тег к профилю
   */
  addTag(profileName, tag) {
    if (!this.metadata.profiles || !this.metadata.profiles[profileName]) {
      throw new Error(`Профиль ${profileName} не найден`);
    }
    
    const profile = this.metadata.profiles[profileName];
    
    // Инициализируем tags, если его нет (для старых профилей)
    if (!profile.tags) {
      profile.tags = [];
    }
    
    // Добавляем тег, если его еще нет
    if (!profile.tags.includes(tag)) {
      profile.tags.push(tag);
      this.saveMetadata();
    }
  }

  /**
   * Получает профили, которые еще не посещали указанный домен
   */
  getProfilesNotVisitedDomain(domain) {
    if (!this.metadata.profiles) {
      return [];
    }
    
    return Object.keys(this.metadata.profiles)
      .filter(name => {
        const profile = this.metadata.profiles[name];
        const visitedDomains = profile.visitedDomains || [];
        return !visitedDomains.includes(domain);
      })
      .map(name => ({
        name,
        ...this.metadata.profiles[name]
      }));
  }

  /**
   * Получает профили с указанным тегом
   */
  getProfilesWithTag(tag) {
    if (!this.metadata.profiles) {
      return [];
    }
    
    return Object.keys(this.metadata.profiles)
      .filter(name => {
        const profile = this.metadata.profiles[name];
        const tags = profile.tags || [];
        return tags.includes(tag);
      })
      .map(name => ({
        name,
        ...this.metadata.profiles[name]
      }));
  }

  /**
   * Получает профили с фильтрацией по количеству уникальных доменов в cookies
   * @param {string} operator - '>' или '<'
   * @param {number} domainsCount - количество доменов для сравнения
   */
  getProfilesByDomainsCount(operator, domainsCount) {
    if (!this.metadata.profiles) {
      return [];
    }
    
    return Object.keys(this.metadata.profiles)
      .filter(name => {
        const profile = this.metadata.profiles[name];
        const cookies = profile.cookies || {};
        const uniqueDomains = cookies.uniqueDomains || 0;
        
        if (operator === '>') {
          return uniqueDomains > domainsCount;
        } else if (operator === '<') {
          return uniqueDomains < domainsCount;
        }
        
        return false;
      })
      .map(name => ({
        name,
        ...this.metadata.profiles[name]
      }));
  }

  /**
   * Получает профили с фильтрацией по дате создания профиля
   * @param {string} operator - '>' (старше) или '<' (младше)
   * @param {number} days - количество дней для сравнения
   */
  getProfilesByCreatedAt(operator, days) {
    if (!this.metadata.profiles) {
      return [];
    }
    
    const now = new Date();
    const targetDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return Object.keys(this.metadata.profiles)
      .filter(name => {
        const profile = this.metadata.profiles[name];
        const createdAt = profile.createdAt;
        
        if (!createdAt) {
          return false; // Нет даты создания - исключаем
        }
        
        const profileDate = new Date(createdAt);
        
        if (operator === '>') {
          // Старше N дней
          return profileDate < targetDate;
        } else if (operator === '<') {
          // Младше N дней
          return profileDate > targetDate;
        }
        
        return false;
      })
      .map(name => ({
        name,
        ...this.metadata.profiles[name]
      }));
  }

  /**
   * Получает профили с применением нескольких фильтров
   * @param {Object} filters - объект с фильтрами
   * @param {string} filters.tag - тег профиля
   * @param {string} filters.notVisitedDomain - исключает домен из посещенных
   * @param {Object} filters.domainsCount - фильтр по количеству доменов {operator: '>', count: 50}
   * @param {Object} filters.createdAt - фильтр по дате создания {operator: '<', days: 2}
   * @param {Object} filters.cooldownMinutes - фильтр по cooldown {minutes: 60}
   * @returns {Array} - массив отфильтрованных профилей
   */
  getFilteredProfiles(filters = {}) {
    if (!this.metadata.profiles) {
      return [];
    }
    
    let filteredProfiles = Object.keys(this.metadata.profiles).map(name => ({
      name,
      ...this.metadata.profiles[name]
    }));
    
    // Фильтр по тегу
    if (filters.tag) {
      filteredProfiles = filteredProfiles.filter(profile => {
        const tags = profile.tags || [];
        return tags.includes(filters.tag);
      });
    }
    
    // Фильтр по не посещенным доменам
    if (filters.notVisitedDomain) {
      filteredProfiles = filteredProfiles.filter(profile => {
        const visitedDomains = profile.visitedDomains || [];
        return !visitedDomains.includes(filters.notVisitedDomain);
      });
    }
    
    // Фильтр по количеству доменов
    if (filters.domainsCount) {
      const { operator, count } = filters.domainsCount;
      filteredProfiles = filteredProfiles.filter(profile => {
        const cookies = profile.cookies || {};
        const uniqueDomains = cookies.uniqueDomains || 0;
        
        if (operator === '>') {
          return uniqueDomains > count;
        } else if (operator === '<') {
          return uniqueDomains < count;
        }
        return false;
      });
    }
    
    // Фильтр по дате создания
    if (filters.createdAt) {
      const { operator, days } = filters.createdAt;
      const now = new Date();
      const targetDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      
      filteredProfiles = filteredProfiles.filter(profile => {
        const createdAt = profile.createdAt;
        if (!createdAt) return false;
        
        const profileDate = new Date(createdAt);
        
        if (operator === '>') {
          return profileDate < targetDate; // Старше
        } else if (operator === '<') {
          return profileDate > targetDate; // Младше
        }
        return false;
      });
    }
    
    // Фильтр по cooldown (время последнего использования)
    if (filters.cooldownMinutes) {
      const cooldownMs = filters.cooldownMinutes * 60 * 1000;
      const now = new Date();
      
      filteredProfiles = filteredProfiles.filter(profile => {
        if (!profile.lastUsed) return true; // Никогда не использовался
        
        const lastUsed = new Date(profile.lastUsed);
        const timeSinceLastUsed = now - lastUsed;
        
        return timeSinceLastUsed >= cooldownMs;
      });
    }
    
    return filteredProfiles;
  }

  /**
   * Выбирает профиль с учетом фильтров и сортировки
   * @param {Object} options - опции выборки
   * @param {Object} options.filters - фильтры (как в getFilteredProfiles)
   * @param {string} options.sortBy - поле для сортировки ('lastUsed', 'createdAt')
   * @param {string} options.sortOrder - порядок сортировки ('asc', 'desc')
   * @returns {Object|null} - выбранный профиль или null
   */
  selectProfile(options = {}) {
    const { filters = {}, sortBy = 'lastUsed', sortOrder = 'asc' } = options;
    
    let profiles = this.getFilteredProfiles(filters);
    
    if (profiles.length === 0) {
      return null;
    }
    
    // Сортируем профили
    profiles.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Преобразуем строки дат в Date объекты для сравнения
      if (sortBy === 'lastUsed' || sortBy === 'createdAt') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return profiles[0];
  }

  /**
   * Возвращает статистику профилей
   */
  getStats() {
    const profiles = this.getAllProfiles();
    
    const deviceStats = {};
    const categoryStats = {};
    const resolutionStats = {};
    const localeStats = {};
    const gpuStats = {};
    
    profiles.forEach(profile => {
      // Устройства
      const device = profile.deviceName || 'Unknown';
      deviceStats[device] = (deviceStats[device] || 0) + 1;
      
      // Категории
      const category = profile.deviceCategory || 'unknown';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      
      // Разрешения
      const res = `${profile.resolution.width}x${profile.resolution.height}`;
      resolutionStats[res] = (resolutionStats[res] || 0) + 1;
      
      // Языки
      localeStats[profile.locale] = (localeStats[profile.locale] || 0) + 1;
      
      // GPU
      if (profile.webgl && profile.webgl.renderer) {
        const gpu = profile.webgl.renderer;
        gpuStats[gpu] = (gpuStats[gpu] || 0) + 1;
      }
    });
    
    return {
      total: profiles.length,
      devices: deviceStats,
      categories: categoryStats,
      resolutions: resolutionStats,
      locales: localeStats,
      gpus: gpuStats
    };
  }
}

export { ProfileGenerator };