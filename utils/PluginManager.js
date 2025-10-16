import fs from 'fs';
import path from 'path';

/**
 * Менеджер плагинов для случайного выбора
 */
class PluginManager {
  constructor(pluginsPath = './plugins') {
    this.pluginsPath = path.resolve(pluginsPath);
    this.availablePlugins = this.scanAvailablePlugins();
  }

  /**
   * Сканирует доступные плагины в папке
   */
  scanAvailablePlugins() {
    const plugins = [];
    
    if (!fs.existsSync(this.pluginsPath)) {
      console.warn(`⚠️ PluginManager: Папка плагинов не найдена: ${this.pluginsPath}`);
      return plugins;
    }

    const items = fs.readdirSync(this.pluginsPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const pluginPath = path.join(this.pluginsPath, item.name);
        const manifestPath = path.join(pluginPath, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            // Проверяем совместимость
            if (manifest.manifest_version && manifest.manifest_version >= 2) {
              plugins.push({
                id: item.name,
                name: manifest.name || `Plugin ${item.name}`,
                version: manifest.version || '1.0.0',
                manifestVersion: manifest.manifest_version,
                permissions: manifest.permissions || [],
                hostPermissions: manifest.host_permissions || [],
                path: pluginPath,
                enabled: true
              });
            }
          } catch (error) {
            console.warn(`⚠️ PluginManager: Ошибка чтения манифеста ${item.name}: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`🔌 PluginManager: Найдено ${plugins.length} совместимых плагинов`);
    return plugins;
  }

  /**
   * Получает случайные плагины
   */
  getRandomPlugins(count = 1, maxCount = null) {
    if (this.availablePlugins.length === 0) {
      console.warn('⚠️ PluginManager: Нет доступных плагинов');
      return [];
    }

    const max = maxCount || this.availablePlugins.length;
    const actualCount = Math.min(count, max, this.availablePlugins.length);
    
    // Создаем копию массива и перемешиваем
    const shuffled = [...this.availablePlugins].sort(() => Math.random() - 0.5);
    
    const selected = shuffled.slice(0, actualCount);
    
    console.log(`🔌 PluginManager: Выбрано ${selected.length} плагинов из ${this.availablePlugins.length} доступных`);
    selected.forEach(plugin => {
      console.log(`   📦 ${plugin.name} v${plugin.version} (${plugin.id})`);
    });
    
    return selected;
  }

  /**
   * Получает все доступные плагины
   */
  getAllPlugins() {
    return this.availablePlugins;
  }

  /**
   * Получает плагин по ID
   */
  getPluginById(id) {
    return this.availablePlugins.find(plugin => plugin.id === id);
  }

  /**
   * Проверяет, существует ли плагин
   */
  pluginExists(id) {
    return this.availablePlugins.some(plugin => plugin.id === id);
  }

  /**
   * Получает статистику плагинов
   */
  getStats() {
    return {
      total: this.availablePlugins.length,
      manifestV2: this.availablePlugins.filter(p => p.manifestVersion === 2).length,
      manifestV3: this.availablePlugins.filter(p => p.manifestVersion === 3).length,
      plugins: this.availablePlugins.map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        manifestVersion: p.manifestVersion
      }))
    };
  }
}

export { PluginManager };

