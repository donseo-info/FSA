import fs from 'fs';
import path from 'path';

/**
 * Менеджер профилей для работы с куками и метаданными
 */
class ProfileManager {
  constructor() {
    this.profilesDir = 'profiles';
    this.metadataFile = path.join(this.profilesDir, 'metadata.json');
    this.ensureMetadataFile();
  }

  /**
   * Создает файл метаданных, если его нет
   */
  ensureMetadataFile() {
    if (!fs.existsSync(this.metadataFile)) {
      const initialData = {
        profiles: {},
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.metadataFile, JSON.stringify(initialData, null, 2));
    }
  }

  /**
   * Загружает метаданные профилей из файла
   */
  loadMetadata() {
    try {
      const data = fs.readFileSync(this.metadataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Ошибка загрузки метаданных:', error.message);
      return { profiles: {}, lastUpdated: new Date().toISOString() };
    }
  }

  /**
   * Сохраняет метаданные профилей в файл
   */
  saveMetadata(metadata) {
    try {
      metadata.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
      return true;
    } catch (error) {
      console.error('Ошибка сохранения метаданных:', error.message);
      return false;
    }
  }

  /**
   * Получает информацию о куках из контекста браузера
   */
  async getCookiesInfo(context) {
    try {
      // Получаем все куки из контекста браузера
      const cookies = await context.cookies();
      
      if (!cookies || cookies.length === 0) {
        return {
          totalCookies: 0,
          uniqueDomains: 0,
          domains: [],
          cookies: []
        };
      }
      
      // Извлекаем уникальные домены
      const domains = new Set();
      const domainStats = {};
      
      cookies.forEach(cookie => {
        if (cookie.domain) {
          // Убираем точку в начале домена (если есть)
          let domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
          // Добавляем в Set для уникальности
          domains.add(domain);
          
          // Считаем куки по доменам
          if (!domainStats[domain]) {
            domainStats[domain] = 0;
          }
          domainStats[domain]++;
        }
      });
      
      const uniqueDomainsCount = domains.size;
      const domainsList = Array.from(domains).sort();
      
      return {
        totalCookies: cookies.length,
        uniqueDomains: uniqueDomainsCount,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Ошибка получения куков:', error.message);
      return {
        totalCookies: 0,
        uniqueDomains: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Обновляет метаданные профиля с информацией о куках
   */
  async updateProfileCookies(profileName, context) {
    try {
      const cookiesInfo = await this.getCookiesInfo(context);
      const metadata = this.loadMetadata();
      
      // Инициализируем profiles, если его нет
      if (!metadata.profiles) {
        metadata.profiles = {};
      }
      
      // Инициализируем профиль, если его нет
      if (!metadata.profiles[profileName]) {
        metadata.profiles[profileName] = {
          name: profileName,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString()
        };
      }
      
      // Обновляем информацию о куках
      metadata.profiles[profileName].cookies = cookiesInfo;
      metadata.profiles[profileName].lastUsed = new Date().toISOString();
      
      // Сохраняем обновленные метаданные
      const saved = this.saveMetadata(metadata);
      
      if (saved) {
        console.log(`✅ Метаданные профиля ${profileName} обновлены: ${cookiesInfo.totalCookies} кук от ${cookiesInfo.uniqueDomains} доменов`);
        return cookiesInfo;
      } else {
        console.error(`❌ Ошибка сохранения метаданных для профиля ${profileName}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Ошибка обновления куков профиля ${profileName}:`, error.message);
      return null;
    }
  }

  /**
   * Получает информацию о куках профиля из метаданных
   */
  getProfileCookiesInfo(profileName) {
    try {
      const metadata = this.loadMetadata();
      const profile = metadata.profiles[profileName];
      
      if (!profile || !profile.cookies) {
        return {
          totalCookies: 0,
          uniqueDomains: 0,
          domains: [],
          lastUpdated: null,
          exists: false
        };
      }
      
      return {
        ...profile.cookies,
        exists: true,
        lastUsed: profile.lastUsed
      };
      
    } catch (error) {
      console.error(`❌ Ошибка получения информации о куках профиля ${profileName}:`, error.message);
      return {
        totalCookies: 0,
        uniqueDomains: 0,
        domains: [],
        lastUpdated: null,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Получает список всех профилей с информацией о куках
   */
  getAllProfilesWithCookies() {
    try {
      const metadata = this.loadMetadata();
      const profiles = [];
      
      for (const [profileName, profileData] of Object.entries(metadata.profiles)) {
        profiles.push({
          name: profileName,
          totalCookies: profileData.cookies?.totalCookies || 0,
          uniqueDomains: profileData.cookies?.uniqueDomains || 0,
          lastUsed: profileData.lastUsed,
          createdAt: profileData.createdAt,
          lastCookiesUpdate: profileData.cookies?.lastUpdated
        });
      }
      
      // Сортируем по количеству куков (по убыванию)
      profiles.sort((a, b) => b.totalCookies - a.totalCookies);
      
      return profiles;
      
    } catch (error) {
      console.error('❌ Ошибка получения списка профилей:', error.message);
      return [];
    }
  }

  /**
   * Выводит статистику по всем профилям
   */
  printProfilesStats() {
    try {
      const profiles = this.getAllProfilesWithCookies();
      
      if (profiles.length === 0) {
        console.log('📊 Профили не найдены');
        return;
      }
      
      console.log('\n📊 Статистика профилей:');
      console.log('═'.repeat(80));
      console.log(`${'Профиль'.padEnd(20)} | ${'Куки'.padEnd(8)} | ${'Домены'.padEnd(8)} | ${'Последнее использование'.padEnd(20)}`);
      console.log('─'.repeat(80));
      
      profiles.forEach(profile => {
        const lastUsed = profile.lastUsed ? new Date(profile.lastUsed).toLocaleDateString('ru-RU') : 'Никогда';
        console.log(
          `${profile.name.padEnd(20)} | ${profile.totalCookies.toString().padEnd(8)} | ${profile.uniqueDomains.toString().padEnd(8)} | ${lastUsed.padEnd(20)}`
        );
      });
      
      console.log('─'.repeat(80));
      const totalCookies = profiles.reduce((sum, p) => sum + p.totalCookies, 0);
      const totalDomains = profiles.reduce((sum, p) => sum + p.uniqueDomains, 0);
      console.log(`Всего: ${profiles.length} профилей, ${totalCookies} кук, ${totalDomains} уникальных доменов`);
      
    } catch (error) {
      console.error('❌ Ошибка вывода статистики:', error.message);
    }
  }

  /**
   * Удаляет метаданные профиля
   */
  removeProfile(profileName) {
    try {
      const metadata = this.loadMetadata();
      
      if (metadata.profiles[profileName]) {
        delete metadata.profiles[profileName];
        const saved = this.saveMetadata(metadata);
        
        if (saved) {
          console.log(`✅ Метаданные профиля ${profileName} удалены`);
          return true;
        } else {
          console.error(`❌ Ошибка удаления метаданных профиля ${profileName}`);
          return false;
        }
      } else {
        console.log(`⚠️ Профиль ${profileName} не найден в метаданных`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Ошибка удаления профиля ${profileName}:`, error.message);
      return false;
    }
  }
}

export default ProfileManager;
