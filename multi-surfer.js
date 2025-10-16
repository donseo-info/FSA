import { BrowserController } from './controllers/BrowserController.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { ProxyManager } from './managers/ProxyManager.js';
import ProfileManager from './ProfileManager.js';
import fs from 'fs';

/**
 * Многопоточный серфер для автоматического серфинга по множеству сайтов
 */
class MultiSurfer {
  constructor(profileName, options = {}) {
    this.profileName = profileName;
    this.port = options.port || 9222;
    this.useProxy = options.useProxy || false;
    this.tabsCount = options.tabsCount || 3;
    this.sites = options.sites || [];
    this.clicksPerSite = options.clicksPerSite !== undefined ? options.clicksPerSite : 2;
    this.delayMin = options.delayMin || 2000; // 2 секунды
    this.delayMax = options.delayMax || 5000; // 5 секунд
    this.enableTabSwitching = options.enableTabSwitching !== false; // по умолчанию включено
    this.viewTimeMin = options.viewTimeMin || 5; // минимальное время просмотра страницы (секунды)
    this.viewTimeMax = options.viewTimeMax || 10; // максимальное время просмотра страницы (секунды)
    
    // Создаем имя лог-файла
    this.logFile = `logs/multi-surfer_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}Z.log`;
    
    // Менеджер профилей для работы с куками
    this.profileManager = new ProfileManager();
    
    // Статистика
    this.stats = {
      totalSites: this.sites.length,
      processedSites: 0,
      successfulClicks: 0,
      failedClicks: 0,
      startTime: null,
      endTime: null
    };
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
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Случайное время просмотра страницы
   */
  async randomViewTime() {
    const viewTimeSeconds = Math.floor(Math.random() * (this.viewTimeMax - this.viewTimeMin + 1)) + this.viewTimeMin;
    const viewTimeMs = viewTimeSeconds * 1000;
    return new Promise(resolve => setTimeout(resolve, viewTimeMs));
  }

  /**
   * Равномерно распределяет сайты по вкладкам
   */
  distributeSitesToTabs() {
    const sitesPerTab = Math.ceil(this.sites.length / this.tabsCount);
    const distribution = [];
    
    for (let i = 0; i < this.tabsCount; i++) {
      const startIndex = i * sitesPerTab;
      const endIndex = Math.min(startIndex + sitesPerTab, this.sites.length);
      const tabSites = this.sites.slice(startIndex, endIndex);
      
      if (tabSites.length > 0) {
        distribution.push({
          tabIndex: i,
          sites: tabSites
        });
      }
    }
    
    return distribution;
  }

  /**
   * Получает кликабельные элементы на странице
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

      return elements;
    } catch (error) {
      this.writeLog(`⚠️ Ошибка поиска элементов: ${error.message}`, 'WARN');
      return [];
    }
  }

  /**
   * Выполняет случайный клик на странице
   */
  async performRandomClick(page, tabIndex) {
    const elements = await this.getClickableElements(page);
    
    if (elements.length === 0) {
      this.writeLog(`[Вкладка ${tabIndex}] ❌ Нет доступных элементов для клика`, 'WARN');
      return false;
    }

    // Выбираем случайный элемент
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    this.writeLog(`[Вкладка ${tabIndex}] 🎯 Кликаем по элементу: ${randomElement.tagName} "${randomElement.text}"`, 'INFO');
    
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

      this.writeLog(`[Вкладка ${tabIndex}] ✅ Клик выполнен успешно`, 'SUCCESS');
      return true;
    } catch (error) {
      this.writeLog(`[Вкладка ${tabIndex}] ❌ Ошибка клика: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Серфинг по одному сайту
   */
  async surfSite(page, site, tabIndex) {
    const siteUrl = site.startsWith('http') ? site : `https://${site}`;
    
    this.writeLog(`[Вкладка ${tabIndex}] 🌐 Переходим на ${siteUrl}...`, 'INFO');
    
    try {
      // Переходим на сайт
      await page.goto(siteUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Ждем немного для загрузки базовых элементов
      await page.waitForTimeout(2000);
      
      // Проверяем готовность сайта
      const isReady = await page.evaluate(() => {
        const hasBody = document.body !== null;
        const hasContent = document.body && document.body.children.length > 0;
        const hasTitle = document.title && document.title.length > 0;
        return hasBody && hasContent && hasTitle;
      });
      
      if (isReady) {
        this.writeLog(`[Вкладка ${tabIndex}] ✅ Сайт готов к работе!`, 'SUCCESS');
      } else {
        this.writeLog(`[Вкладка ${tabIndex}] ⚠️ Сайт загружен, но может быть не полностью готов`, 'WARN');
      }
      
      // Получаем заголовок страницы (без логирования)
      try {
        await page.title();
      } catch (error) {
        // Игнорируем ошибки получения заголовка
      }

      // Просматриваем главную страницу
      await this.randomViewTime();

      // Выполняем клики (только если clicksPerSite > 0)
      if (this.clicksPerSite > 0) {
        for (let i = 1; i <= this.clicksPerSite; i++) {
          // Ждем перед кликом
          await this.randomDelay();
          
          // Выполняем клик
          const clickSuccess = await this.performRandomClick(page, tabIndex);
          
          if (clickSuccess) {
            this.stats.successfulClicks++;
            // Ждем загрузки новой страницы
            await page.waitForTimeout(3000);
            
            // Просматриваем новую страницу
            await this.randomViewTime();
          } else {
            this.stats.failedClicks++;
          }
        }
      }
      
      this.writeLog(`[Вкладка ${tabIndex}] ✅ Серфинг по ${site} завершен!`, 'SUCCESS');
      this.stats.processedSites++;
      
      return true;
    } catch (error) {
      this.writeLog(`[Вкладка ${tabIndex}] ❌ Ошибка серфинга по ${site}: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Получает информацию о куках профиля через ProfileManager
   */
  async getCookiesInfo(context) {
    try {
      this.writeLog(`🍪 Получаем куки из профиля...`, 'INFO');
      
      const cookiesInfo = await this.profileManager.getCookiesInfo(context);
      
      if (cookiesInfo.totalCookies === 0) {
        this.writeLog(`🍪 Куки не найдены в профиле`, 'WARN');
      } else {
        this.writeLog(`🍪 Найдено ${cookiesInfo.totalCookies} кук от ${cookiesInfo.uniqueDomains} уникальных доменов`, 'SUCCESS');
        this.writeLog(`🍪 Домены: ${cookiesInfo.domains.join(', ')}`, 'INFO');
      }
      
      return cookiesInfo;
      
    } catch (error) {
      this.writeLog(`🍪 Ошибка получения куков: ${error.message}`, 'ERROR');
      return {
        totalCookies: 0,
        uniqueDomains: 0,
        domains: []
      };
    }
  }

  /**
   * Применяет спуфы к основной странице с проверкой
   */
  async applySpoofsToMainPage(page, tabIndex, browserController) {
    try {
      // Применяем спуфы к основной странице
      
      // Применяем спуфы через BrowserController
      await browserController.applySpoofs(page);
      
      // Проверяем успешность применения спуфов
      const spoofsStatus = await page.evaluate(() => {
        const results = {};
        
        // Проверяем Screen spoof
        results.screen = {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight
        };
        
        // Проверяем Language spoof
        results.language = {
          language: navigator.language,
          languages: navigator.languages
        };
        
        // Проверяем Hardware spoof
        results.hardware = {
          cores: navigator.hardwareConcurrency,
          memory: navigator.deviceMemory
        };
        
        // Проверяем WebGL spoof
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            results.webgl = {
              vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
              renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'
            };
          }
        } catch (e) {
          results.webgl = { error: e.message };
        }
        
        return results;
      });
      
      // Спуфы применены успешно
      
      // Спуфы успешно применены к основной странице
      
    } catch (error) {
      this.writeLog(`[Вкладка ${tabIndex}] ❌ Ошибка применения спуфов к основной странице: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Работа одной вкладки
   */
  async workTab(context, tabSites, tabIndex, allPages, browserController) {
    const page = await context.newPage();
    // Создана новая страница
    
    // Блокируем попапы на уровне страницы
    page.on('popup', async (popup) => {
      try {
        const popupUrl = popup.url();
        // Блокируем попап
        await popup.close();
      } catch (error) {
        // Игнорируем ошибки закрытия попапов
      }
    });
    
    // Применяем спуфы к основной странице
    await this.applySpoofsToMainPage(page, tabIndex, browserController);
    
    // Добавляем страницу в общий список для переключения
    allPages.push({ page, tabIndex });
    
    for (const site of tabSites) {
      await this.surfSite(page, site, tabIndex);
      
      // После каждого сайта делаем случайное переключение между вкладками
      if (this.enableTabSwitching && allPages.length > 1) {
        await this.switchToRandomTab(allPages, tabIndex);
      }
    }
    
    await page.close();
    this.writeLog(`[Вкладка ${tabIndex}] 🔒 Вкладка закрыта`, 'INFO');
  }

  /**
   * Переключается на случайную вкладку для имитации поведения пользователя
   */
  async switchToRandomTab(allPages, currentTabIndex) {
    try {
      // Выбираем случайную вкладку (не текущую)
      const availableTabs = allPages.filter(tab => tab.tabIndex !== currentTabIndex);
      if (availableTabs.length === 0) return;
      
      const randomTab = availableTabs[Math.floor(Math.random() * availableTabs.length)];
      
      // Активируем случайную вкладку
      await randomTab.page.bringToFront();
      
      // Ждем немного на случайной вкладке
      const waitTime = Math.floor(Math.random() * 3000) + 1000; // 1-4 секунды
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Возвращаемся на исходную вкладку
      const currentPage = allPages.find(tab => tab.tabIndex === currentTabIndex);
      if (currentPage) {
        await currentPage.page.bringToFront();
      }
      
    } catch (error) {
      this.writeLog(`[Вкладка ${currentTabIndex}] ⚠️ Ошибка переключения вкладок: ${error.message}`, 'WARN');
    }
  }

  /**
   * Основной метод многопоточного серфинга
   */
  async startMultiSurfing() {
    this.stats.startTime = new Date();
    
    this.writeLog(`🚀 Запуск многопоточного серфинга с профилем: ${this.profileName}`, 'INFO');
    this.writeLog(`📊 Параметры: ${this.tabsCount} вкладок, ${this.sites.length} сайтов, ${this.clicksPerSite} кликов на сайт`, 'INFO');
    this.writeLog(`⏱️ Время просмотра: ${this.viewTimeMin}-${this.viewTimeMax} секунд на страницу`, 'INFO');
    this.writeLog(`🌐 Сайты: ${this.sites.join(', ')}`, 'INFO');
    
    let browserController = null;
    let context = null;
    
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
      const connection = await browserController.connect();
      context = connection.context;
      
      // Получаем информацию о куках профиля
      const cookiesInfo = await this.getCookiesInfo(context);
      
      // Распределяем сайты по вкладкам
      const distribution = this.distributeSitesToTabs();
      this.writeLog(`📋 Распределение сайтов по вкладкам:`, 'INFO');
      distribution.forEach(tab => {
        this.writeLog(`   Вкладка ${tab.tabIndex}: ${tab.sites.length} сайтов (${tab.sites.join(', ')})`, 'INFO');
      });

      // Создаем общий список страниц для переключения между вкладками
      const allPages = [];
      
      // Запускаем все вкладки параллельно
      const tabPromises = distribution.map(tab => 
        this.workTab(context, tab.sites, tab.tabIndex, allPages, browserController)
      );

      // Ждем завершения всех вкладок
      await Promise.all(tabPromises);

      this.stats.endTime = new Date();
      const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
      
      this.writeLog(`\n🎉 Многопоточный серфинг завершен!`, 'SUCCESS');
      this.writeLog(`📊 Статистика:`, 'SUCCESS');
      this.writeLog(`   ⏱️ Время выполнения: ${duration} секунд`, 'SUCCESS');
      this.writeLog(`   🌐 Обработано сайтов: ${this.stats.processedSites}/${this.stats.totalSites}`, 'SUCCESS');
      this.writeLog(`   ✅ Успешных кликов: ${this.stats.successfulClicks}`, 'SUCCESS');
      this.writeLog(`   ❌ Неудачных кликов: ${this.stats.failedClicks}`, 'SUCCESS');
      this.writeLog(`   📈 Эффективность: ${Math.round((this.stats.successfulClicks / (this.stats.successfulClicks + this.stats.failedClicks)) * 100)}%`, 'SUCCESS');
      this.writeLog(`   🍪 Куки профиля: ${cookiesInfo.totalCookies} кук от ${cookiesInfo.uniqueDomains} доменов`, 'SUCCESS');

    } catch (error) {
      this.writeLog(`❌ Ошибка многопоточного серфинга: ${error.message}`, 'ERROR');
      console.error(error);
    } finally {
      // Сохраняем метаданные профиля с информацией о куках (до закрытия браузера)
      if (browserController && context) {
        try {
          this.writeLog(`💾 Сохраняем метаданные профиля...`, 'INFO');
          await this.profileManager.updateProfileCookies(this.profileName, context);
        } catch (saveError) {
          this.writeLog(`⚠️ Ошибка сохранения метаданных: ${saveError.message}`, 'WARN');
        }
      }
      
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

// Проверяем, запущен ли файл напрямую
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  const profileName = args[0];

  if (!profileName) {
    console.log('❌ Укажите имя профиля!');
    console.log('Использование: node multi-surfer.js <профиль> [опции]');
    console.log('Примеры:');
    console.log('  node multi-surfer.js bot-123456789 --tabs=3 --sites=site1.com,site2.com --clicks=2');
    console.log('  node multi-surfer.js bot-123456789 --tabs=5 --clicks=1 --proxy');
    console.log('  node multi-surfer.js bot-123456789 --tabs=3 --no-tab-switching');
    console.log('  node multi-surfer.js bot-123456789 --tabs=3 --view-time=5-10');
    process.exit(1);
  }

  // Список сайтов по умолчанию
  const defaultSites = [
    'fortochka-okna.ru',
    'mosokna.ru',
    'окошко-рф.рф',
    'fabrikaokon.ru',
    'balkony-pod-kluch.ru',
    'okno.ru',
    'ramokna.ru',
    'fabrikauyuta.ru',
    'lemanapro.ru'
  ];

  // Парсим опции
  const options = {
    tabsCount: 3,
    sites: defaultSites,
    clicksPerSite: 2,
    useProxy: false,
    enableTabSwitching: true,
    viewTimeMin: 5,
    viewTimeMax: 10
  };

  // Парсим количество вкладок
  const tabsArg = args.find(arg => arg.startsWith('--tabs='));
  if (tabsArg) {
    const tabs = parseInt(tabsArg.split('=')[1]);
    if (tabs > 0 && tabs <= 10) {
      options.tabsCount = tabs;
    }
  }

  // Парсим список сайтов
  const sitesArg = args.find(arg => arg.startsWith('--sites='));
  if (sitesArg) {
    const sitesList = sitesArg.split('=')[1];
    options.sites = sitesList.split(',').map(site => site.trim());
  }

  // Парсим количество кликов
  const clicksArg = args.find(arg => arg.startsWith('--clicks='));
  if (clicksArg) {
    const clicks = parseInt(clicksArg.split('=')[1]);
    if (clicks >= 0) {
      options.clicksPerSite = clicks;
    }
  }

  // Парсим прокси
  if (args.includes('--proxy')) {
    options.useProxy = true;
  }

  // Парсим переключение вкладок
  if (args.includes('--no-tab-switching')) {
    options.enableTabSwitching = false;
  }

  // Парсим время просмотра страниц
  const viewTimeArg = args.find(arg => arg.startsWith('--view-time='));
  if (viewTimeArg) {
    const viewTimeValue = viewTimeArg.split('=')[1];
    if (viewTimeValue.includes('-')) {
      const [min, max] = viewTimeValue.split('-').map(v => parseInt(v.trim()));
      if (min > 0 && max > 0 && min <= max) {
        options.viewTimeMin = min;
        options.viewTimeMax = max;
      }
    } else {
      const time = parseInt(viewTimeValue);
      if (time > 0) {
        options.viewTimeMin = time;
        options.viewTimeMax = time;
      }
    }
  }

  // Создаем и запускаем многопоточный серфер
  const multiSurfer = new MultiSurfer(profileName, options);
  await multiSurfer.startMultiSurfing();
}

// Экспортируем класс для использования в других модулях
export { MultiSurfer };
