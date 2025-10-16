import fs from 'fs';
import path from 'path';

/**
 * Подключение реальных плагинов из папки plugins
 * Поддерживает загрузку существующих Chrome расширений
 */
class RealPluginSpoof {
  constructor(options = {}) {
    this.profilePath = options.profilePath || './profile';
    this.pluginsPath = options.pluginsPath || './plugins';
    this.pluginName = options.pluginName || 'Real Plugin';
    this.pluginId = options.pluginId || '2'; // ID плагина в папке plugins
    this.enabled = options.enabled !== false; // по умолчанию включен
  }

  /**
   * Получает путь к реальному плагину
   */
  getRealPluginPath() {
    const pluginPath = path.resolve(this.pluginsPath, this.pluginId);
    
    if (!fs.existsSync(pluginPath)) {
      console.warn(`⚠️ RealPlugin: Плагин ${this.pluginId} не найден в ${pluginPath}`);
      return null;
    }

    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn(`⚠️ RealPlugin: manifest.json не найден в ${pluginPath}`);
      return null;
    }

    console.log(`🔌 RealPlugin: Абсолютный путь к плагину: ${pluginPath}`);
    return pluginPath;
  }

  /**
   * Проверяет совместимость плагина
   */
  checkPluginCompatibility() {
    const pluginPath = this.getRealPluginPath();
    if (!pluginPath) {
      return false;
    }

    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Проверяем версию манифеста
      if (manifest.manifest_version && manifest.manifest_version >= 2) {
        console.log(`✅ RealPlugin: Плагин ${this.pluginId} совместим (v${manifest.manifest_version})`);
        return true;
      } else {
        console.warn(`⚠️ RealPlugin: Плагин ${this.pluginId} использует устаревший манифест`);
        return false;
      }
    } catch (error) {
      console.warn(`⚠️ RealPlugin: Ошибка чтения манифеста: ${error.message}`);
      return false;
    }
  }

  /**
   * Получает информацию о плагине
   */
  getPluginInfo() {
    const pluginPath = this.getRealPluginPath();
    if (!pluginPath) {
      return null;
    }

    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      return {
        name: manifest.name || this.pluginName,
        version: manifest.version || '1.0.0',
        description: manifest.description || 'Real plugin',
        permissions: manifest.permissions || [],
        hostPermissions: manifest.host_permissions || [],
        manifestVersion: manifest.manifest_version || 2
      };
    } catch (error) {
      console.warn(`⚠️ RealPlugin: Ошибка получения информации: ${error.message}`);
      return null;
    }
  }

  /**
   * Создает копию плагина в профиле (если нужно)
   */
  createPluginCopy() {
    if (!this.enabled) {
      return null;
    }

    const sourcePath = this.getRealPluginPath();
    if (!sourcePath) {
      return null;
    }

    const targetPath = path.join(this.profilePath, `real-plugin-${this.pluginId}`);
    
    try {
      // Создаем целевую папку
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      // Копируем файлы плагина
      this.copyDirectory(sourcePath, targetPath);
      
      console.log(`📦 RealPlugin: Плагин ${this.pluginId} скопирован в ${targetPath}`);
      return targetPath;
    } catch (error) {
      console.warn(`⚠️ RealPlugin: Ошибка копирования: ${error.message}`);
      return null;
    }
  }

  /**
   * Рекурсивно копирует директорию
   */
  copyDirectory(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  /**
   * Возвращает путь к расширению для загрузки
   */
  getExtensionPath() {
    if (!this.enabled) {
      console.log(`🔌 RealPlugin: Плагин ${this.pluginId} отключен`);
      return null;
    }

    // Проверяем совместимость
    if (!this.checkPluginCompatibility()) {
      return null;
    }

    // Получаем информацию о плагине
    const pluginInfo = this.getPluginInfo();
    if (pluginInfo) {
      console.log(`🔌 RealPlugin: ${pluginInfo.name} v${pluginInfo.version}`);
      console.log(`🔌 RealPlugin: Разрешения: ${pluginInfo.permissions.join(', ')}`);
    }

    // Возвращаем путь к оригинальному плагину
    // Chrome может загружать расширения напрямую из исходной папки
    return this.getRealPluginPath();
  }

  /**
   * Применяет спуф (для совместимости с другими спуфами)
   */
  async apply(page) {
    // Этот метод не используется, так как плагин загружается как расширение
    console.log(`🔌 RealPlugin: Плагин ${this.pluginId} загружен как Chrome extension`);
  }

  /**
   * Включает/выключает плагин
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`🔌 RealPlugin: Плагин ${this.pluginId} ${enabled ? 'включен' : 'отключен'}`);
  }

  /**
   * Устанавливает ID плагина
   */
  setPluginId(pluginId) {
    this.pluginId = pluginId;
    console.log(`🔌 RealPlugin: Установлен плагин ID: ${pluginId}`);
  }
}

export { RealPluginSpoof };
