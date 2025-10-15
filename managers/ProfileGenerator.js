import fs from 'fs';
import path from 'path';
import { getRandomDevice } from '../configs/devices.js';

/**
 * Генератор профилей браузера
 */
class ProfileGenerator {
  constructor(options = {}) {
    this.profilesDir = path.resolve('./profiles');
    this.metadataFile = path.join(this.profilesDir, 'metadata.json');
    
    // Chrome paths можно задать через options или использовать по умолчанию
    this.chromePaths = options.chromePaths || [
      {
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        versions: ['141.0.7390.66', '141.0.7390.65', '141.0.7390.56']
      },
      {
        path: 'F:\\Browser\\140-186\\App\\Chrome-bin\\chrome.exe',
        versions: ['140.0.6921.186']
      }
    ];
    
    this.ensureProfilesDir();
    this.metadata = this.loadMetadata();
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
      chromeVersion
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
    
    // Сохраняем метаданные
    this.metadata[profileName] = {
      ...config,
      createdAt: new Date().toISOString(),
      lastUsed: null
    };
    
    this.saveMetadata();
    
    console.log(`✅ Профиль создан: ${profileName}`);
    console.log(`   🖥️ Устройство: ${config.deviceName}`);
    console.log(`   📐 Разрешение: ${config.resolution.width}x${config.resolution.height}`);
    console.log(`   🗣️ Язык: ${config.locale}`);
    console.log(`   💻 Железо: ${config.hardware.cores} ядер, ${config.hardware.memory} GB`);
    console.log(`   🎮 GPU: ${config.webgl.renderer}`);
    
    return this.metadata[profileName];
  }

  /**
   * Получает или создает профиль
   */
  getOrCreateProfile(profileName) {
    console.log('🔍 getOrCreateProfile вызван с profileName:', profileName);
    console.log('🔍 profileExists результат:', this.profileExists(profileName));
    
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
    console.log('🔍 getProfileConfig вызван с profileName:', profileName);
    console.log('🔍 Доступные профили:', Object.keys(this.metadata));
    
    if (!this.metadata[profileName]) {
      throw new Error(`Профиль ${profileName} не найден`);
    }
    
    // Обновляем время последнего использования
    this.metadata[profileName].lastUsed = new Date().toISOString();
    this.saveMetadata();
    
    return this.metadata[profileName];
  }

  /**
   * Проверяет существование профиля
   */
  profileExists(profileName) {
    return !!this.metadata[profileName];
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
    delete this.metadata[profileName];
    this.saveMetadata();
    
    console.log(`🗑️ Профиль удален: ${profileName}`);
  }

  /**
   * Возвращает список всех профилей
   */
  getAllProfiles() {
    return Object.keys(this.metadata).map(name => ({
      name,
      ...this.metadata[name]
    }));
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