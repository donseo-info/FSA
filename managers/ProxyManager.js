import fs from 'fs';
import https from 'https';
import http from 'http';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Управление прокси с проверкой
 */
class ProxyManager {
  constructor(proxyFilePath = './proxies.txt', options = {}) {
    this.proxyFilePath = proxyFilePath;
    this.proxies = [];
    this.currentIndex = 0; // Будет установлен случайно после загрузки прокси
    
    // Настройки проверки
    this.checkUrl = options.checkUrl || 'https://api.ipify.org?format=json';
    this.checkTimeout = options.checkTimeout || 10000; // 10 секунд
    this.retryDelay = options.retryDelay || 5000; // 5 секунд между попытками
    this.maxRetries = options.maxRetries || 3; // 3 попытки на прокси
    
    // Текущий проверенный прокси
    this.checkedProxy = null;
    this.checkedProxyIP = null;
    
    this.loadProxies();
  }

  /**
   * Загружает прокси из файла
   */
  loadProxies() {
    if (!fs.existsSync(this.proxyFilePath)) {
      console.warn(`⚠️ Файл ${this.proxyFilePath} не найден`);
      return;
    }

    try {
      const content = fs.readFileSync(this.proxyFilePath, 'utf-8');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));

      this.proxies = lines.map(line => this.parseProxyLine(line))
        .filter(proxy => proxy !== null);

      // Устанавливаем случайный начальный индекс для лучшего распределения нагрузки
      if (this.proxies.length > 0) {
        this.currentIndex = Math.floor(Math.random() * this.proxies.length);
        console.log(`✅ Загружено прокси: ${this.proxies.length}`);
        console.log(`🎲 Начальный прокси: #${this.currentIndex + 1} (${this.proxies[this.currentIndex].host}:${this.proxies[this.currentIndex].port})`);
      } else {
        console.log(`✅ Загружено прокси: ${this.proxies.length}`);
      }

    } catch (error) {
      console.error('❌ Ошибка загрузки прокси:', error.message);
    }
  }

  /**
   * Парсит строку прокси
   */
  parseProxyLine(line) {
    try {
      let protocol = 'socks5';
      let username = undefined;
      let password = undefined;
      let host, port;

      if (line.includes('://')) {
        const [proto, rest] = line.split('://');
        protocol = proto.toLowerCase();
        line = rest;
      }

      if (line.includes('@')) {
        const [auth, address] = line.split('@');
        
        if (auth.includes(':')) {
          [username, password] = auth.split(':');
        }
        
        line = address;
      }

      if (line.includes(':')) {
        [host, port] = line.split(':');
        port = parseInt(port);
      } else {
        return null;
      }

      let server;
      if (username && password) {
        server = `${protocol}://${username}:${password}@${host}:${port}`;
      } else {
        server = `${protocol}://${host}:${port}`;
      }

      return {
        server,
        username,
        password,
        protocol,
        host,
        port,
        raw: line
      };

    } catch (error) {
      console.error(`⚠️ Не удалось распарсить прокси: ${line}`);
      return null;
    }
  }

  /**
   * Проверяет прокси через HTTP запрос
   */
  async checkProxyOnce(proxy) {
    return new Promise((resolve) => {
      try {
        console.log(`🔍 Проверка прокси: ${proxy.host}:${proxy.port}`);
        
        const agent = new SocksProxyAgent(proxy.server);
        
        const request = https.get(this.checkUrl, {
          agent,
          timeout: this.checkTimeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const ip = json.ip;
              
              if (ip) {
                console.log(`✅ Прокси рабочий! IP: ${ip}`);
                resolve({ success: true, ip });
              } else {
                console.log(`❌ Прокси не вернул IP`);
                resolve({ success: false, ip: null });
              }
            } catch (e) {
              console.log(`❌ Ошибка парсинга ответа:`, e.message);
              resolve({ success: false, ip: null });
            }
          });
        });
        
        request.on('error', (error) => {
          console.log(`❌ Ошибка соединения: ${error.message}`);
          resolve({ success: false, ip: null });
        });
        
        request.on('timeout', () => {
          console.log(`⏱️ Таймаут (${this.checkTimeout}ms)`);
          request.destroy();
          resolve({ success: false, ip: null });
        });
        
      } catch (error) {
        console.log(`❌ Ошибка создания запроса:`, error.message);
        resolve({ success: false, ip: null });
      }
    });
  }

  /**
   * Ждет указанное время
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Проверяет прокси с повторными попытками
   */
  async checkProxyWithRetries(proxy) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.log(`\n🔄 Попытка ${attempt}/${this.maxRetries} для ${proxy.host}:${proxy.port}`);
      
      const result = await this.checkProxyOnce(proxy);
      
      if (result.success) {
        return result;
      }
      
      if (attempt < this.maxRetries) {
        console.log(`⏳ Повтор через ${this.retryDelay / 1000} секунд...`);
        await this.sleep(this.retryDelay);
      }
    }
    
    console.log(`❌ Прокси ${proxy.host}:${proxy.port} не работает после ${this.maxRetries} попыток\n`);
    return { success: false, ip: null };
  }

  /**
   * Находит и проверяет рабочий прокси (главная функция)
   * Начинает с случайного прокси и проверяет по кругу
   */
  async getCheckedProxy() {
    if (this.proxies.length === 0) {
      console.error('❌ Нет прокси для проверки!');
      return null;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🔍 ПОИСК РАБОЧЕГО ПРОКСИ');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`📊 Всего прокси: ${this.proxies.length}`);
    console.log(`⚙️ Попыток на прокси: ${this.maxRetries}`);
    console.log(`⏱️ Таймаут: ${this.checkTimeout / 1000}с`);
    console.log(`🔄 Задержка между попытками: ${this.retryDelay / 1000}с\n`);

    const startIndex = this.currentIndex;
    let checkedCount = 0;

    // Проверяем все прокси по кругу
    do {
      const proxy = this.proxies[this.currentIndex];
      checkedCount++;
      
      console.log(`📡 Проверка прокси ${checkedCount}/${this.proxies.length}`);
      
      const result = await this.checkProxyWithRetries(proxy);
      
      if (result.success) {
        this.checkedProxy = proxy;
        this.checkedProxyIP = result.ip;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log('✅ РАБОЧИЙ ПРОКСИ НАЙДЕН!');
        console.log(`${'='.repeat(60)}`);
        console.log(`🌐 Сервер: ${proxy.server}`);
        console.log(`📍 IP: ${result.ip}`);
        console.log(`${'='.repeat(60)}\n`);
        
        // Переходим к следующему прокси для следующего вызова
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        
        return proxy;
      }
      
      // Переходим к следующему прокси
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      
    } while (this.currentIndex !== startIndex);

    console.log(`\n❌ НЕ НАЙДЕНО РАБОЧИХ ПРОКСИ!`);
    console.log(`Проверено: ${checkedCount} прокси\n`);
    
    this.checkedProxy = null;
    this.checkedProxyIP = null;
    
    return null;
  }

  /**
   * Возвращает IP последнего проверенного прокси
   */
  getIP() {
    return this.checkedProxyIP || false;
  }

  /**
   * Возвращает последний проверенный прокси
   */
  getLastCheckedProxy() {
    return this.checkedProxy;
  }

  /**
   * Получает следующий прокси (БЕЗ проверки)
   */
  getNextProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

    return proxy;
  }

  /**
   * Получает случайный прокси (БЕЗ проверки)
   */
  getRandomProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.proxies.length);
    return this.proxies[randomIndex];
  }

  /**
   * Получает прокси по индексу (БЕЗ проверки)
   */
  getProxyByIndex(index) {
    if (index < 0 || index >= this.proxies.length) {
      return null;
    }

    return this.proxies[index];
  }

  /**
   * Возвращает количество прокси
   */
  getCount() {
    return this.proxies.length;
  }

  /**
   * Возвращает все прокси
   */
  getAllProxies() {
    return this.proxies;
  }
}

export { ProxyManager };