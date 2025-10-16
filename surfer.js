import { BrowserController } from './controllers/BrowserController.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { ProxyManager } from './managers/ProxyManager.js';
import fs from 'fs';

/**
 * Серфер для автоматического серфинга по сайтам
 */
class Surfer {
  constructor(profileName, options = {}) {
    this.profileName = profileName;
    this.port = options.port || 9222;
    this.useProxy = options.useProxy || false;
    this.minClicks = options.minClicks || 1;
    this.maxClicks = options.maxClicks || 2;
    this.delayMin = options.delayMin || 2000; // 2 секунды
    this.delayMax = options.delayMax || 5000; // 5 секунд
    this.targetUrl = options.targetUrl || 'https://www.7labels.ru';
    
    // Создаем имя лог-файла
    this.logFile = `logs/surfer_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}Z.log`;
  }

  /**
   * Логирование
   */
  writeLog(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Записываем в файл
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  /**
   * Случайная задержка
   */
  async randomDelay() {
    const delay = Math.floor(Math.random() * (this.delayMax - this.delayMin + 1)) + this.delayMin;
    this.writeLog(`⏳ Ждем ${delay}мс...`, 'INFO');
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Получает случайные кликабельные элементы
   */
  async getClickableElements(page) {
    try {
      const elements = await page.evaluate(() => {
        const selectors = [
          'a[href]',           // Ссылки
          'button',            // Кнопки
          '[onclick]',         // Элементы с onclick
          '[role="button"]',   // Элементы с ролью кнопки
          'input[type="submit"]', // Submit кнопки
          'input[type="button"]', // Input кнопки
          '.btn',              // Элементы с классом btn
          '.button',           // Элементы с классом button
          '.link',             // Элементы с классом link
          '.menu-item',        // Пункты меню
          '.nav-item',         // Навигационные элементы
          '.card',             // Карточки
          '.item',             // Элементы списка
          '.product',          // Товары
          '.article',          // Статьи
          '.news-item'         // Новости
        ];

        const clickableElements = [];
        const currentHostname = window.location.hostname;
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element, index) => {
            // Проверяем, что элемент видим и кликабелен
            const rect = element.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && 
                            rect.top >= 0 && rect.left >= 0 &&
                            rect.bottom <= window.innerHeight && 
                            rect.right <= window.innerWidth;
            
            const isClickable = !element.disabled && 
                              !element.hasAttribute('disabled') &&
                              window.getComputedStyle(element).pointerEvents !== 'none';
            
            if (isVisible && isClickable) {
              const href = element.href || '';
              
              // Фильтруем элементы (исключаем внешние ссылки, якоря и т.д.)
              if (href) {
                // Исключаем внешние ссылки
                if (href.startsWith('http') && !href.includes(currentHostname)) {
                  return;
                }
                // Исключаем якоря и javascript ссылки
                if (href.startsWith('#') || href.startsWith('javascript:')) {
                  return;
                }
              }
              
              clickableElements.push({
                selector: selector,
                index: index,
                text: element.textContent?.trim().substring(0, 50) || '',
                href: href,
                tagName: element.tagName.toLowerCase()
              });
            }
          });
        });

        return clickableElements;
      });

      this.writeLog(`🔍 Найдено ${elements.length} кликабельных элементов`, 'INFO');
      return elements;
    } catch (error) {
      this.writeLog(`⚠️ Ошибка поиска элементов: ${error.message}`, 'WARN');
      return [];
    }
  }

  /**
   * Выполняет случайный клик
   */
  async performRandomClick(page) {
    const elements = await this.getClickableElements(page);
    
    if (elements.length === 0) {
      this.writeLog(`❌ Нет доступных элементов для клика`, 'WARN');
      return false;
    }

    // Выбираем случайный элемент
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    this.writeLog(`🎯 Кликаем по элементу: ${randomElement.tagName} "${randomElement.text}"`, 'INFO');
    
    try {
      // Прокручиваем к элементу
      await page.evaluate(({ selector, index }) => {
        const elements = document.querySelectorAll(selector);
        if (elements[index]) {
          elements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, { selector: randomElement.selector, index: randomElement.index });

      // Ждем немного после прокрутки
      await page.waitForTimeout(1000);

      // Кликаем по элементу
      await page.evaluate(({ selector, index }) => {
        const elements = document.querySelectorAll(selector);
        if (elements[index]) {
          elements[index].click();
        }
      }, { selector: randomElement.selector, index: randomElement.index });

      this.writeLog(`✅ Клик выполнен успешно`, 'SUCCESS');
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка клика: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Основной метод серфинга
   */
  async startSurfing() {
    this.writeLog(`🚀 Запуск серфинга с профилем: ${this.profileName}`, 'INFO');
    this.writeLog(`🌐 Целевой сайт: ${this.targetUrl}`, 'INFO');
    this.writeLog(`🎯 Кликов: ${this.minClicks}-${this.maxClicks}`, 'INFO');
    
    let browserController = null;
    
    try {
      // Проверяем существование профиля
      const generator = new ProfileGenerator();
      if (!generator.profileExists(this.profileName)) {
        throw new Error(`Профиль "${this.profileName}" не найден!`);
      }

      // Получаем прокси если нужно
      let proxy = null;
      if (this.useProxy) {
        const proxyManager = new ProxyManager('./proxies.txt', {
          checkUrl: 'https://api.ipify.org?format=json',
          checkTimeout: 10000,
          retryDelay: 5000,
          maxRetries: 3
        });
        
        proxy = proxyManager.getRandomProxy();
        if (proxy) {
          this.writeLog(`🔗 Используется прокси: ${proxy.server}`, 'INFO');
        }
      }

      // Создаем контроллер браузера
      browserController = new BrowserController(this.profileName, { 
        port: this.port, 
        proxy,
        enablePlugins: false // Отключаем плагины для серфинга
      });

      // Запускаем браузер
      this.writeLog(`🌐 Запускаем браузер...`, 'INFO');
      await browserController.launch();
      
      // Подключаемся к браузеру
      const { context } = await browserController.connect();
      
      // Создаем новую страницу
      const page = await context.newPage();
      this.writeLog(`📄 Создана новая страница`, 'SUCCESS');

      // Переходим на целевой сайт
      this.writeLog(`🌐 Переходим на ${this.targetUrl}...`, 'INFO');
      await page.goto(this.targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Ждем немного для загрузки базовых элементов
      await page.waitForTimeout(2000);
      
      // Проверяем готовность сайта по наличию элементов
      const isReady = await page.evaluate(() => {
        // Проверяем наличие основных элементов страницы
        const hasBody = document.body !== null;
        const hasContent = document.body && document.body.children.length > 0;
        const hasTitle = document.title && document.title.length > 0;
        
        return hasBody && hasContent && hasTitle;
      });
      
      if (isReady) {
        this.writeLog(`✅ Сайт готов к работе!`, 'SUCCESS');
      } else {
        this.writeLog(`⚠️ Сайт загружен, но может быть не полностью готов`, 'WARN');
      }
      
      // Получаем заголовок страницы
      try {
        const title = await page.title();
        this.writeLog(`📄 Заголовок: ${title}`, 'INFO');
      } catch (error) {
        this.writeLog(`⚠️ Не удалось получить заголовок: ${error.message}`, 'WARN');
      }

      // Определяем количество кликов
      const clickCount = Math.floor(Math.random() * (this.maxClicks - this.minClicks + 1)) + this.minClicks;
      this.writeLog(`🎯 Будем делать ${clickCount} кликов`, 'INFO');

      // Выполняем клики
      for (let i = 1; i <= clickCount; i++) {
        this.writeLog(`\n--- Клик ${i}/${clickCount} ---`, 'INFO');
        
        // Ждем перед кликом
        await this.randomDelay();
        
        // Выполняем клик
        const clickSuccess = await this.performRandomClick(page);
        
        if (clickSuccess) {
          // Ждем загрузки новой страницы
          await page.waitForTimeout(3000);
          
          // Получаем новый URL
          const currentUrl = page.url();
          this.writeLog(`📍 Текущий URL: ${currentUrl}`, 'INFO');
          
          // Получаем новый заголовок
          try {
            const newTitle = await page.title();
            this.writeLog(`📄 Новый заголовок: ${newTitle}`, 'INFO');
          } catch (error) {
            this.writeLog(`⚠️ Не удалось получить заголовок: ${error.message}`, 'WARN');
          }
        } else {
          this.writeLog(`❌ Клик ${i} не удался, продолжаем...`, 'WARN');
        }
      }

      // Финальная задержка
      this.writeLog(`\n⏳ Финальная задержка...`, 'INFO');
      await this.randomDelay();
      
      this.writeLog(`✅ Серфинг завершен успешно!`, 'SUCCESS');
      this.writeLog(`📊 Всего кликов: ${clickCount}`, 'SUCCESS');
      this.writeLog(`📍 Финальный URL: ${page.url()}`, 'SUCCESS');

    } catch (error) {
      this.writeLog(`❌ Ошибка серфинга: ${error.message}`, 'ERROR');
      console.error(error);
    } finally {
      // Закрываем браузер
      if (browserController) {
        try {
          await browserController.close();
          this.writeLog(`🔒 Браузер закрыт`, 'INFO');
        } catch (error) {
          this.writeLog(`⚠️ Ошибка закрытия браузера: ${error.message}`, 'WARN');
        }
      }
    }
  }
}

// ========================================
// ИСПОЛЬЗОВАНИЕ
// ========================================

const args = process.argv.slice(2);
const profileName = args[0];

if (!profileName) {
  console.log('❌ Укажите имя профиля!');
  console.log('Использование: node surfer.js <профиль> [опции]');
  console.log('Примеры:');
  console.log('  node surfer.js bot-123456789');
  console.log('  node surfer.js bot-123456789 --proxy');
  console.log('  node surfer.js bot-123456789 --clicks=3');
  console.log('  node surfer.js bot-123456789 --url=https://www.7labels.ru');
  process.exit(1);
}

// Парсим опции
const options = {
  useProxy: args.includes('--proxy'),
  targetUrl: 'https://www.7labels.ru'
};

// Парсим количество кликов
const clicksArg = args.find(arg => arg.startsWith('--clicks='));
if (clicksArg) {
  const clicks = parseInt(clicksArg.split('=')[1]);
  if (clicks > 0) {
    options.minClicks = clicks;
    options.maxClicks = clicks;
  }
}

// Парсим URL
const urlArg = args.find(arg => arg.startsWith('--url='));
if (urlArg) {
  options.targetUrl = urlArg.split('=')[1];
}

// Создаем и запускаем серфер
const surfer = new Surfer(profileName, options);
await surfer.startSurfing();
