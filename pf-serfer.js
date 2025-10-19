import { BrowserController } from './controllers/BrowserController.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { ProxyManager } from './managers/ProxyManager.js';
import ProfileManager from './ProfileManager.js';
import { RealisticCursor } from './new-class/realistic-cursor.js';
import { RealisticScroll } from './new-class/realistic-scroll.js';
import { SearchPageCursor } from './new-class/search-page-cursor.js';
import { SearchPageScroll } from './new-class/search-page-scroll.js';
import { CaptchaSolver } from './new-class/captcha-solver.js';
import { BannerHandler } from './new-class/banner-handler.js';
import fs from 'fs';

/**
 * PF-Serfer - Человекоподобный браузер для выполнения задач с готовыми профилями
 * Основан на multi-surfer.js, но сфокусирован на максимальной человекоподобности
 */
class PFSerfer {
  constructor(profileName, options = {}) {
    this.profileName = profileName;
    this.port = options.port || 9222;
    this.useProxy = options.useProxy || false;
    this.enableResourceBlocking = options.enableResourceBlocking !== false;
    this.enablePlugins = options.enablePlugins !== false;
    
    // Настройки блокировки ресурсов
    this.blockingConfig = {
      useYandexRules: options.useYandexRules || false,
      blockRulesFile: options.blockRulesFile || 'configs/block-rules.txt',
      allowRulesFile: options.allowRulesFile || 'configs/allow-rules.txt'
    };
    
    // Настройки человекоподобности
    this.humanBehavior = {
      enableIdleJitter: options.enableIdleJitter !== false, // Фоновое дрожание курсора
      enableNervousMovements: options.enableNervousMovements === true, // Нервные движения (ТОЛЬКО для капчи!)
      enableReadingSimulation: options.enableReadingSimulation !== false, // Имитация чтения
      enableRandomExploration: options.enableRandomExploration !== false, // Случайные движения
      thinkingTimeMin: options.thinkingTimeMin || 500, // Минимальное время "думания"
      thinkingTimeMax: options.thinkingTimeMax || 2000, // Максимальное время "думания"
      movementSpeed: options.movementSpeed || 'medium' // Скорость движений
    };
    
    // Настройки капчи
    this.captchaSettings = {
      enableAutoSolve: options.enableAutoSolve !== false,
      enableAutoCheck: options.enableAutoCheck !== false, // Автоматическая проверка капчи после действий
      apiKey: options.captchaApiKey || 'b7bfc10970a2467492f55e1f74d0d800',
      captchaDir: options.captchaDir || './captcha_images'
    };
    
    // Создаем имя лог-файла
    this.logFile = `logs/pf-serfer_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}Z.log`;
    
    // Менеджер профилей для работы с куками
    this.profileManager = new ProfileManager();
    
    // Компоненты человекоподобности
    this.cursor = null;
    this.scroll = null;
    this.captchaSolver = null;
    this.bannerHandler = null;
    
    // Статистика
    this.stats = {
      startTime: null,
      endTime: null,
      pagesVisited: 0,
      captchasSolved: 0,
      captchasFailed: 0,
      clicksPerformed: 0,
      scrollsPerformed: 0
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
   * Случайная задержка для человекоподобности
   */
  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Время на "обдумывание" перед действием
   */
  async thinkingTime() {
    const thinkingTime = Math.floor(Math.random() * (this.humanBehavior.thinkingTimeMax - this.humanBehavior.thinkingTimeMin + 1)) + this.humanBehavior.thinkingTimeMin;
    return new Promise(resolve => setTimeout(resolve, thinkingTime));
  }

  /**
   * Инициализация компонентов человекоподобности
   */
  async initializeHumanComponents(page) {
    try {
      this.writeLog('🤖 Инициализация компонентов человекоподобности...', 'INFO');
      
      // Инициализируем реалистичный курсор
      this.cursor = new RealisticCursor(page);
      await this.cursor.init();
      this.writeLog('✅ RealisticCursor инициализирован', 'SUCCESS');
      
      // Инициализируем реалистичную прокрутку
      this.scroll = new RealisticScroll(page, this.cursor);
      this.writeLog('✅ RealisticScroll инициализирован', 'SUCCESS');
      
      // Инициализируем решатель капчи
      if (this.captchaSettings.enableAutoSolve) {
        this.captchaSolver = new CaptchaSolver({
          captchaDir: this.captchaSettings.captchaDir,
          apiKey: this.captchaSettings.apiKey
        });
        this.writeLog('✅ CaptchaSolver инициализирован', 'SUCCESS');
      }

      // Инициализируем BannerHandler (всегда)
      this.bannerHandler = new BannerHandler(page, this.cursor);
      this.writeLog('✅ BannerHandler инициализирован', 'SUCCESS');
      
      // Включаем фоновое дрожание курсора
      if (this.humanBehavior.enableIdleJitter) {
        await this.cursor.startIdleJitter();
        this.writeLog('✅ Фоновое дрожание курсора включено', 'SUCCESS');
      }
      
      this.writeLog('🎯 Все компоненты человекоподобности готовы!', 'SUCCESS');
      
    } catch (error) {
      this.writeLog(`❌ Ошибка инициализации компонентов: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Человекоподобный клик с реалистичным движением
   */
  async humanClick(selector, options = {}) {
    if (!this.cursor) {
      throw new Error('RealisticCursor не инициализирован!');
    }
    
    const {
      thinking = true,
      doubleClick = false,
      speed = this.humanBehavior.movementSpeed
    } = options;
    
    try {
      this.writeLog(`👆 Человекоподобный клик по: ${selector}`, 'INFO');
      
      // Время на обдумывание
      if (thinking) {
        await this.thinkingTime();
      }
      
      // Выполняем клик
      await this.cursor.click(selector, { thinking: false, doubleClick, speed });
      
      this.stats.clicksPerformed++;
      this.writeLog(`✅ Клик выполнен успешно`, 'SUCCESS');
      
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка клика: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Человекоподобная прокрутка
   */
  async humanScroll(direction = 'down', amount = 300) {
    if (!this.scroll) {
      throw new Error('RealisticScroll не инициализирован!');
    }
    
    try {
      this.writeLog(`📜 Человекоподобная прокрутка: ${direction} на ${amount}px`, 'INFO');
      
      await this.scroll.scrollPage(direction, amount);
      
      this.stats.scrollsPerformed++;
      this.writeLog(`✅ Прокрутка выполнена`, 'SUCCESS');
      
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка прокрутки: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Прокрутка к элементу
   */
  async scrollToElement(selector, options = {}) {
    if (!this.scroll) {
      throw new Error('RealisticScroll не инициализирован!');
    }
    
    try {
      this.writeLog(`🎯 Прокрутка к элементу: ${selector}`, 'INFO');
      
      await this.scroll.scrollToElement(selector, options);
      
      this.stats.scrollsPerformed++;
      this.writeLog(`✅ Прокрутка к элементу выполнена`, 'SUCCESS');
      
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка прокрутки к элементу: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Прокрутка до конца страницы с паузами для чтения
   */
  async scrollToBottom(options = {}) {
    if (!this.scroll) {
      throw new Error('RealisticScroll не инициализирован!');
    }
    
    try {
      this.writeLog(`📜 Прокрутка до конца страницы`, 'INFO');
      
      await this.scroll.scrollToBottom(options);
      
      this.stats.scrollsPerformed++;
      this.writeLog(`✅ Прокрутка до конца выполнена`, 'SUCCESS');
      
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка прокрутки до конца: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Прокрутка и изучение элементов
   */
  async scrollAndExplore(selector, options = {}) {
    if (!this.scroll) {
      throw new Error('RealisticScroll не инициализирован!');
    }
    
    try {
      this.writeLog(`🔍 Прокрутка и изучение элементов: ${selector}`, 'INFO');
      
      await this.scroll.scrollAndExplore(selector, options);
      
      this.stats.scrollsPerformed++;
      this.writeLog(`✅ Изучение элементов завершено`, 'SUCCESS');
      
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка изучения элементов: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Прокрутка к элементу и взаимодействие
   */
  async scrollToAndInteract(selector, action = 'click', options = {}) {
    if (!this.scroll) {
      throw new Error('RealisticScroll не инициализирован!');
    }
    
    try {
      this.writeLog(`🎯 Прокрутка и взаимодействие: ${selector} (${action})`, 'INFO');
      
      await this.scroll.scrollToAndInteract(selector, action, options);
      
      // Автоматическая проверка капчи после взаимодействия
      await this.autoCheckCaptcha(this.page, `${action} по ${selector}`);
      
      this.stats.scrollsPerformed++;
      this.writeLog(`✅ Взаимодействие выполнено`, 'SUCCESS');
      
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка взаимодействия: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Плавная прокрутка с переменной скоростью
   */
  async smoothScroll(direction = 'down', distance = 500, options = {}) {
    if (!this.scroll) {
      throw new Error('RealisticScroll не инициализирован!');
    }
    
    try {
      this.writeLog(`🌊 Плавная прокрутка: ${direction} на ${distance}px`, 'INFO');
      
      await this.scroll.smoothScroll(direction, distance, options);
      
      this.stats.scrollsPerformed++;
      this.writeLog(`✅ Плавная прокрутка выполнена`, 'SUCCESS');
      
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка плавной прокрутки: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Прокрутка с поиском контента
   */
  async scrollAndFind(selector, options = {}) {
    if (!this.scroll) {
      throw new Error('RealisticScroll не инициализирован!');
    }
    
    try {
      this.writeLog(`🔍 Поиск элемента прокруткой: ${selector}`, 'INFO');
      
      const found = await this.scroll.scrollAndFind(selector, options);
      
      this.stats.scrollsPerformed++;
      
      if (found) {
        this.writeLog(`✅ Элемент найден`, 'SUCCESS');
      } else {
        this.writeLog(`⚠️ Элемент не найден`, 'WARN');
      }
      
      return found;
    } catch (error) {
      this.writeLog(`❌ Ошибка поиска: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Имитация чтения текста
   */
  async simulateReading(selector, duration = 3000) {
    if (!this.cursor || !this.humanBehavior.enableReadingSimulation) {
      return;
    }
    
    try {
      this.writeLog(`📖 Имитация чтения: ${selector}`, 'INFO');
      
      await this.cursor.readText(selector, duration);
      
      this.writeLog(`✅ Чтение завершено`, 'SUCCESS');
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка имитации чтения: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Случайное изучение страницы
   */
  async explorePage(count = 3) {
    if (!this.cursor || !this.humanBehavior.enableRandomExploration) {
      return;
    }
    
    try {
      this.writeLog(`🔍 Изучение страницы (${count} движений)`, 'INFO');
      
      await this.cursor.exploreRandomly(count);
      
      this.writeLog(`✅ Изучение завершено`, 'SUCCESS');
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка изучения страницы: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Нервные движения во время ожидания (ТОЛЬКО для капчи!)
   */
  async nervousWait(condition, maxDuration = 15000) {
    if (!this.cursor || !this.humanBehavior.enableNervousMovements) {
      // Простое ожидание без движений
      const startTime = Date.now();
      while (await condition() && (Date.now() - startTime < maxDuration)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return;
    }
    
    try {
      this.writeLog(`😰 Нервное ожидание (макс. ${maxDuration/1000}с) - ТОЛЬКО для капчи!`, 'INFO');
      
      await this.cursor.nervousWait(condition, maxDuration);
      
      this.writeLog(`✅ Ожидание завершено`, 'SUCCESS');
      return true;
    } catch (error) {
      this.writeLog(`❌ Ошибка нервного ожидания: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Спокойное ожидание с легкими движениями (для обычной работы)
   */
  async calmWait(condition, maxDuration = 15000) {
    const startTime = Date.now();
    
    while (await condition() && (Date.now() - startTime < maxDuration)) {
      // Легкие движения курсора (не нервные!)
      if (this.cursor && Math.random() > 0.7) {
        await this.cursor.exploreRandomly(1);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
  }

  /**
   * Проверка наличия капчи на странице
   */
  async checkCaptcha(page) {
    if (!this.captchaSolver) {
      return false;
    }

    try {
      // Проверяем URL на наличие капчи
      if (page.url().includes('showcaptcha') || page.url().includes('captcha')) {
        this.writeLog(`🔐 Обнаружена капча в URL: ${page.url()}`, 'INFO');
        return true;
      }

      // Проверяем наличие элементов капчи на странице
      const captchaSelectors = [
        '.captcha',
        '#captcha',
        '.yandex-captcha',
        '.smart-captcha',
        '[data-captcha]',
        'iframe[src*="captcha"]',
        'iframe[src*="showcaptcha"]'
      ];

      for (const selector of captchaSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            this.writeLog(`🔐 Обнаружена капча по селектору: ${selector}`, 'INFO');
            return true;
          }
        } catch (e) {
          // Игнорируем ошибки поиска элементов
        }
      }

      return false;
    } catch (error) {
      this.writeLog(`❌ Ошибка проверки капчи: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Обработка баннеров после навигации
   */
  async handleBannersAfterNavigation(page = null) {
    if (!this.bannerHandler) {
      return;
    }
    
    const targetPage = page || this.page;

    try {
      this.writeLog('🎯 Проверка баннеров после навигации...', 'INFO');
      
      const result = await this.bannerHandler.handleBannersAfterLoad(targetPage);
      
      if (result.closed > 0) {
        this.writeLog(`✅ Закрыто баннеров: ${result.closed}/${result.total}`, 'SUCCESS');
        this.stats.bannersClosed = (this.stats.bannersClosed || 0) + result.closed;
      } else {
        this.writeLog('✅ Баннеры не обнаружены', 'SUCCESS');
      }
      
      return result;
    } catch (error) {
      this.writeLog(`❌ Ошибка обработки баннеров: ${error.message}`, 'ERROR');
      return { closed: 0, total: 0 };
    }
  }

  /**
   * Автоматическая проверка и решение капчи после действия
   */
  async autoCheckCaptcha(page, actionName = 'действие') {
    if (!this.captchaSettings.enableAutoCheck) {
      return true;
    }

    try {
      this.writeLog(`🔍 Проверка капчи после ${actionName}...`, 'INFO');
      
      // Небольшая задержка для загрузки страницы
      await page.waitForTimeout(1000);
      
      const hasCaptcha = await this.checkCaptcha(page);
      
      if (hasCaptcha) {
        this.writeLog(`🔐 Капча обнаружена после ${actionName}`, 'WARNING');
        
        const solved = await this.handleCaptcha(page);
        
        if (solved) {
          this.writeLog(`✅ Капча решена после ${actionName}`, 'SUCCESS');
          // Дополнительная задержка после решения капчи
          await page.waitForTimeout(2000);
          return true;
        } else {
          this.writeLog(`❌ Не удалось решить капчу после ${actionName}`, 'ERROR');
          return false;
        }
      } else {
        this.writeLog(`✅ Капча не обнаружена после ${actionName}`, 'SUCCESS');
        return true;
      }
    } catch (error) {
      this.writeLog(`❌ Ошибка автоматической проверки капчи: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Обработка капчи
   */
  async handleCaptcha(page) {
    if (!this.captchaSolver) {
      this.writeLog('⚠️ CaptchaSolver не инициализирован, пропускаем капчу', 'WARN');
      return false;
    }
    
    try {
      this.writeLog('🔐 Обнаружена капча, запускаем автоматическое решение...', 'INFO');
      
      const success = await this.captchaSolver.solveAndSubmit(page, this.cursor);
      
      if (success) {
        this.stats.captchasSolved++;
        this.writeLog('✅ Капча решена автоматически!', 'SUCCESS');
        return true;
      } else {
        this.stats.captchasFailed++;
        this.writeLog('❌ Не удалось решить капчу автоматически', 'ERROR');
        return false;
      }
    } catch (error) {
      this.stats.captchasFailed++;
      this.writeLog(`❌ Ошибка обработки капчи: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Переход на страницу с человекоподобным поведением
   */
  async navigateToPage(page, url, options = {}) {
    const {
      exploreAfterLoad = true,
      readTitle = true,
      scrollAfterLoad = true
    } = options;
    
    try {
      this.writeLog(`🌐 Переход на: ${url}`, 'INFO');
      
      // Переходим на страницу
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Ждем загрузки
      await page.waitForTimeout(2000);
      
      this.stats.pagesVisited++;
      
      // Для Яндекса пропускаем автоматические действия
      const isYandex = url.includes('yandex.ru') || url.includes('dzen.ru');
      
      if (!isYandex) {
        // Изучаем страницу
        if (exploreAfterLoad) {
          await this.explorePage(2);
        }
        
        // Читаем заголовок
        if (readTitle) {
          try {
            const title = await page.title();
            if (title) {
              await this.simulateReading('title', 2000);
            }
          } catch (error) {
            // Игнорируем ошибки чтения заголовка
          }
        }
        
        // Прокручиваем страницу
        if (scrollAfterLoad) {
          await this.smoothScroll('down', 400, { 
            acceleration: true, 
            deceleration: true,
            pauseChance: 0.3 
          });
        }
      } else {
        console.log('🎯 Пропускаем автоматические действия для Яндекса');
        
        // Для Яндекса делаем минимальные движения курсора с RealisticCursor
        console.log('🎯 Имитируем естественное поведение на странице Яндекса...');
        
        if (this.cursor) {
          try {
            // Используем правильный метод exploreRandomly для естественных движений
            await this.cursor.exploreRandomly(1);
          } catch (e) {
            console.log('⚠️ Не удалось выполнить движения курсора с RealisticCursor:', e.message);
            // Fallback к простым движениям
            try {
              await page.mouse.move(400, 300, { steps: 5 });
              await this.randomDelay(500, 800);
              await page.mouse.move(600, 400, { steps: 5 });
              await this.randomDelay(300, 500);
            } catch (e2) {
              console.log('⚠️ Не удалось выполнить простые движения курсора, используем паузу');
              await this.randomDelay(1000, 1500);
            }
          }
        } else {
          console.log('⚠️ RealisticCursor не инициализирован, используем простые движения');
          try {
            await page.mouse.move(400, 300, { steps: 5 });
            await this.randomDelay(500, 800);
            await page.mouse.move(600, 400, { steps: 5 });
            await this.randomDelay(300, 500);
          } catch (e) {
            console.log('⚠️ Не удалось выполнить простые движения курсора, используем паузу');
            await this.randomDelay(1000, 1500);
          }
        }
      }
      
      // Автоматическая проверка капчи после навигации
      await this.autoCheckCaptcha(page, 'навигации');
      
      // Автоматическое закрытие баннеров после навигации
      if (this.bannerHandler) {
        await this.handleBannersAfterNavigation();
      }
      
      this.stats.pagesVisited++;
      this.writeLog(`✅ Переход на ${url} завершен`, 'SUCCESS');
      return true;
      
    } catch (error) {
      this.writeLog(`❌ Ошибка перехода на ${url}: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Получает информацию о куках профиля
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
   * Применяет спуфы к странице
   */
  async applySpoofsToPage(page, browserController) {
    try {
      this.writeLog('🎭 Применяем спуфы к странице...', 'INFO');
      
      // Применяем спуфы через BrowserController
      await browserController.applySpoofs(page);
      
      this.writeLog('✅ Спуфы применены успешно', 'SUCCESS');
      
    } catch (error) {
      this.writeLog(`❌ Ошибка применения спуфов: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Основной метод запуска PF-Serfer
   */
  async start() {
    this.stats.startTime = new Date();
    
    this.writeLog(`🚀 Запуск PF-Serfer с профилем: ${this.profileName}`, 'INFO');
    this.writeLog(`🎯 Режим: Максимальная человекоподобность`, 'INFO');
    this.writeLog(`🤖 Компоненты: RealisticCursor, RealisticScroll, CaptchaSolver`, 'INFO');
    this.writeLog(`🛡️ Блокировка ресурсов: ${this.blockingConfig.useYandexRules ? 'Яндекс правила' : 'Стандартные правила'}`, 'INFO');
    this.writeLog(`📁 Файлы блокировки: ${this.blockingConfig.blockRulesFile}, ${this.blockingConfig.allowRulesFile}`, 'INFO');
    
    let browserController = null;
    let context = null;
    let page = null;
    
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
        enablePlugins: this.enablePlugins,
        enableResourceBlocking: this.enableResourceBlocking,
        blockingConfig: this.blockingConfig
      });

      // Запускаем браузер
      this.writeLog(`🌐 Запускаем браузер...`, 'INFO');
      await browserController.launch();
      
      // Подключаемся к браузеру
      const connection = await browserController.connect();
      context = connection.context;
      
      // Создаем страницу
      page = await context.newPage();
      
      // Применяем спуфы
      await this.applySpoofsToPage(page, browserController);
      
      // Инициализируем компоненты человекоподобности
      await this.initializeHumanComponents(page);
      
      // Получаем информацию о куках профиля
      const cookiesInfo = await this.getCookiesInfo(context);
      
      this.writeLog(`\n🎉 PF-Serfer готов к работе!`, 'SUCCESS');
      this.writeLog(`📊 Статистика профиля:`, 'SUCCESS');
      this.writeLog(`   🍪 Куки: ${cookiesInfo.totalCookies} от ${cookiesInfo.uniqueDomains} доменов`, 'SUCCESS');
      this.writeLog(`   🎯 Компоненты человекоподобности: Активны`, 'SUCCESS');
      this.writeLog(`   🔐 Авторешение капчи: ${this.captchaSettings.enableAutoSolve ? 'Включено' : 'Отключено'}`, 'SUCCESS');
      
      // Возвращаем объект с методами для работы
      return {
        page,
        context,
        browserController,
        cursor: this.cursor,
        scroll: this.scroll,
        captchaSolver: this.captchaSolver,
        
        // Методы для работы
        navigateToPage: (url, options) => this.navigateToPage(page, url, options),
        humanClick: (selector, options) => this.humanClick(selector, options),
        humanScroll: (direction, amount) => this.humanScroll(direction, amount),
        scrollToElement: (selector, options) => this.scrollToElement(selector, options),
        scrollToBottom: (options) => this.scrollToBottom(options),
        scrollAndExplore: (selector, options) => this.scrollAndExplore(selector, options),
        scrollToAndInteract: (selector, action, options) => this.scrollToAndInteract(selector, action, options),
        smoothScroll: (direction, distance, options) => this.smoothScroll(direction, distance, options),
        scrollAndFind: (selector, options) => this.scrollAndFind(selector, options),
        simulateReading: (selector, duration) => this.simulateReading(selector, duration),
        explorePage: (count) => this.explorePage(count),
        nervousWait: (condition, maxDuration) => this.nervousWait(condition, maxDuration),
        calmWait: (condition, maxDuration) => this.calmWait(condition, maxDuration),
        checkCaptcha: () => this.checkCaptcha(page),
        autoCheckCaptcha: (actionName) => this.autoCheckCaptcha(page, actionName),
        handleCaptcha: () => this.handleCaptcha(page),
        handleBanners: () => this.handleBannersAfterNavigation(),
        closeBanners: () => this.bannerHandler ? this.bannerHandler.closeAllBanners() : { closed: 0, total: 0 },
        randomDelay: (min, max) => this.randomDelay(min, max),
        thinkingTime: () => this.thinkingTime(),
        
        // Методы поиска
        searchOnYandex: (query, targetDomain, maxPages) => this.searchOnYandex(page, query, targetDomain, maxPages),
        getSearchResults: () => this.getSearchResults(page),
        findAndClickDomainLink: (targetDomain) => this.findAndClickDomainLink(page, targetDomain),
        
        // Статистика
        getStats: () => this.stats,
        
        // Закрытие
        close: async () => {
          this.stats.endTime = new Date();
          const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
          
          this.writeLog(`\n🎉 PF-Serfer завершил работу!`, 'SUCCESS');
          this.writeLog(`📊 Финальная статистика:`, 'SUCCESS');
          this.writeLog(`   ⏱️ Время работы: ${duration} секунд`, 'SUCCESS');
          this.writeLog(`   🌐 Страниц посещено: ${this.stats.pagesVisited}`, 'SUCCESS');
          this.writeLog(`   👆 Кликов выполнено: ${this.stats.clicksPerformed}`, 'SUCCESS');
          this.writeLog(`   📜 Прокруток выполнено: ${this.stats.scrollsPerformed}`, 'SUCCESS');
          this.writeLog(`   🔐 Капч решено: ${this.stats.captchasSolved}`, 'SUCCESS');
          this.writeLog(`   ❌ Капч не решено: ${this.stats.captchasFailed}`, 'SUCCESS');
          this.writeLog(`   🎯 Баннеров закрыто: ${this.stats.bannersClosed || 0}`, 'SUCCESS');
          
          // Останавливаем фоновое дрожание
          if (this.cursor) {
            this.cursor.stopIdleJitter();
          }
          
          // Сохраняем метаданные профиля
          try {
            await this.profileManager.updateProfileCookies(this.profileName, context);
          } catch (saveError) {
            this.writeLog(`⚠️ Ошибка сохранения метаданных: ${saveError.message}`, 'WARN');
          }
          
          // Закрываем браузер
          if (browserController) {
            await browserController.close();
          }
        }
      };

    } catch (error) {
      this.writeLog(`❌ Ошибка PF-Serfer: ${error.message}`, 'ERROR');
      console.error(error);
      
      // Закрываем браузер в случае ошибки
      if (browserController) {
        try {
          await browserController.close();
        } catch (closeError) {
          this.writeLog(`⚠️ Ошибка закрытия браузера: ${closeError.message}`, 'WARN');
        }
      }
      
      throw error;
    }
  }

  /**
   * Подключается к уже открытому браузеру
   */
  async connectToExistingBrowser() {
    try {
      this.writeLog(`🔗 Подключение к существующему браузеру...`, 'INFO');
      
      // Создаем BrowserController
      const browserController = new BrowserController(this.profileName, {
        blockRulesFile: this.blockRulesFile,
        allowRulesFile: this.allowRulesFile
      });
      
      // Подключаемся к существующему браузеру
      await browserController.connect();
      
      // Получаем контекст и страницу
      const context = browserController.context;
      const pages = await context.pages();
      const page = pages[0] || await context.newPage();
      
      // Применяем спуфы к странице
      await this.applySpoofsToPage(page, browserController);
      
      // Инициализируем компоненты человекоподобности
      await this.initializeComponents(page);
      
      this.writeLog(`✅ Подключение к браузеру успешно`, 'SUCCESS');
      
      // Возвращаем объект с методами для работы
      return {
        page,
        context,
        browserController,
        cursor: this.cursor,
        scroll: this.scroll,
        captchaSolver: this.captchaSolver,
        
        // Методы для работы
        navigateToPage: (url, options) => this.navigateToPage(page, url, options),
        handleBanners: () => this.handleBannersAfterNavigation(),
        closeBanners: () => this.bannerHandler ? this.bannerHandler.closeAllBanners() : { closed: 0, total: 0 },
        randomDelay: (min, max) => this.randomDelay(min, max),
        
        // Закрытие
        close: async () => {
          if (browserController) {
            await browserController.close();
          }
        }
      };

    } catch (error) {
      this.writeLog(`❌ Ошибка подключения к браузеру: ${error.message}`, 'ERROR');
      return null;
    }
  }

  /**
   * Выполняет поиск на Яндексе
   */
  async searchOnYandex(page, query, targetDomain = null, maxPages = 3) {
    try {
      console.log(`🔍 Выполняем поиск: "${query}"`);
      
      // Для Яндекса делаем минимальное поведение
      console.log('🎯 Имитируем естественное поведение на странице Яндекса...');
      
      // Небольшая пауза для имитации чтения страницы
      await this.randomDelay(1000, 1500);
      
      // Ищем поле поиска в основном документе и во фреймах
      const searchSelectors = [
        'input.arrow__input.mini-suggest__input',
        'input[name="text"]',
        '.mini-suggest__input',
        'input[aria-label="Запрос"]',
        'input[role="combobox"]'
      ];
      
      let searchInput = null;
      let foundFrame = null;
      let searchInputBounds = null;
      
      // Сначала ищем в основном документе
      for (const selector of searchSelectors) {
        try {
          const element = page.locator(selector).first();
          const isVisible = await element.isVisible({ timeout: 1000 });
          if (isVisible) {
            searchInput = element;
            foundFrame = 'main';
            searchInputBounds = await element.boundingBox();
            console.log(`✅ Найдено поле поиска в основном документе: ${selector}`);
            break;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
      
      // Если не найдено в основном документе, ищем во фреймах
      if (!searchInput) {
        console.log('🔍 Ищем поле поиска во фреймах...');
        const frames = page.frames();
        console.log(`🖼️ Найдено фреймов: ${frames.length}`);
        
        for (let i = 0; i < frames.length; i++) {
          try {
            // Проверяем что есть во фрейме
            const frameInputs = await frames[i].evaluate(() => {
              const inputs = Array.from(document.querySelectorAll('input, textarea'));
              return inputs.map((input, index) => ({
                index,
                tagName: input.tagName,
                type: input.type,
                name: input.name,
                placeholder: input.placeholder,
                className: input.className,
                id: input.id,
                ariaLabel: input.getAttribute('aria-label')
              }));
            });
            
            console.log(`🔍 Фрейм ${i} содержит ${frameInputs.length} input/textarea элементов:`);
            frameInputs.forEach((input, j) => {
              console.log(`  ${j + 1}. ${input.tagName} type="${input.type}" name="${input.name}" placeholder="${input.placeholder}" class="${input.className}" aria-label="${input.ariaLabel}"`);
            });
            
            for (const selector of searchSelectors) {
              try {
                const element = frames[i].locator(selector).first();
                const isVisible = await element.isVisible({ timeout: 1000 });
                if (isVisible) {
                  searchInput = element;
                  foundFrame = `frame-${i}`;
                  searchInputBounds = await element.boundingBox();
                  console.log(`✅ Найдено поле поиска во фрейме ${i}: ${selector}`);
                  break;
                }
              } catch (e) {
                // Игнорируем ошибки для отдельных селекторов
              }
            }
            if (searchInput) break;
          } catch (e) {
            console.log(`❌ Не удалось проверить фрейм ${i}: ${e.message}`);
          }
        }
      }
      
      if (!searchInput) {
        throw new Error('Поле поиска не найдено ни в основном документе, ни во фреймах');
      }
      
      // Плавно подводим курсор к полю поиска
      if (searchInputBounds) {
        const targetX = searchInputBounds.x + searchInputBounds.width / 2;
        const targetY = searchInputBounds.y + searchInputBounds.height / 2;
        
        console.log(`🎯 Подводим курсор к полю поиска: (${Math.round(targetX)}, ${Math.round(targetY)})`);
        
        // Используем RealisticCursor для подвода к полю поиска
        if (this.cursor) {
          try {
            // Используем moveSmooth с правильными координатами для подвода к полю поиска
            await this.cursor.moveSmooth(this.cursor.currentX, this.cursor.currentY, targetX, targetY, 800);
            await this.randomDelay(200, 400);
          } catch (e) {
            console.log('⚠️ Не удалось подвести курсор с RealisticCursor:', e.message);
            // Fallback к простому движению
            try {
              await page.mouse.move(targetX, targetY, { steps: 10 });
              await this.randomDelay(200, 400);
            } catch (e2) {
              console.log('⚠️ Не удалось подвести курсор, используем прямой клик');
            }
          }
        } else {
          console.log('⚠️ RealisticCursor не инициализирован, используем простой подвод');
          try {
            await page.mouse.move(targetX, targetY, { steps: 10 });
            await this.randomDelay(200, 400);
          } catch (e) {
            console.log('⚠️ Не удалось подвести курсор, используем прямой клик');
          }
        }
      }
      
      // Небольшая пауза перед кликом
      console.log('🎯 Пауза перед кликом по полю поиска...');
      await this.randomDelay(300, 500);
      
      // Кликаем и вводим запрос
      await searchInput.click();
      await this.randomDelay(300, 500);
      
      await searchInput.fill('');
      await this.randomDelay(200, 400);
      
      await searchInput.type(query, { delay: 50 });
      await this.randomDelay(1000, 1500);
      
      // Нажимаем Enter
      await searchInput.press('Enter');
      
      // Ждем появления новой вкладки с результатами поиска
      let resultsPage = null;
      try {
        resultsPage = await page.context().waitForEvent('page', { timeout: 10000 });
        console.log('✅ Новая вкладка с результатами поиска открыта');
        
        // Ждем загрузки результатов поиска
        console.log('⏳ Ждем загрузки результатов поиска...');
        await resultsPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
        await resultsPage.waitForSelector('.serp-item, .organic, .search-result', { timeout: 10000 });
        console.log('✅ Результаты поиска загружены');
        
        // ПЕРЕКЛЮЧАЕМСЯ на новую вкладку с результатами
        console.log('🔄 Переключаемся на вкладку с результатами поиска...');
        await resultsPage.bringToFront();
        
        // Проверяем URL новой страницы
        const currentUrl = resultsPage.url();
        console.log(`📍 Текущий URL: ${currentUrl}`);
        
        // Ждем немного для визуального перехода
        await this.randomDelay(2000, 3000);
        console.log('✅ Переключились на страницу результатов поиска');
        
        // Проверяем капчу и баннеры на новой странице результатов
        await this.autoCheckCaptcha(resultsPage, 'поиска');
        if (this.bannerHandler) {
          await this.handleBannersAfterNavigation(resultsPage);
        }
        
      } catch (e) {
        console.log('⚠️ Не удалось дождаться открытия новой вкладки с результатами:', e.message);
      }
      
      await this.randomDelay(2000, 3000);
      
      console.log(`✅ Поиск "${query}" выполнен успешно`);
      
      // Если указан целевой домен, ищем и кликаем по ссылке
      if (targetDomain) {
        console.log(`🎯 Ищем ссылку с доменом: ${targetDomain}`);
        const clickResult = await this.findAndClickDomainLink(resultsPage || page, targetDomain, maxPages);
        return { success: true, query: query, domainClick: clickResult };
      }
      
      return { success: true, query: query };
      
    } catch (error) {
      console.error('❌ Ошибка поиска:', error.message);
      throw error;
    }
  }

  /**
   * Ищет и кликает по ссылке с определенным доменом по нескольким страницам
   */
  async findAndClickDomainLink(page, targetDomain, maxPages = 3) {
    try {
      console.log(`🔍 Ищем ссылку с доменом: ${targetDomain} (максимум ${maxPages} страниц)`);
      console.log(`📍 Работаем на странице: ${page.url()}`);
      
      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        console.log(`📄 Проверяем страницу ${currentPage}...`);
        
        // Создаем видимый курсор на каждой странице
        await page.evaluate(() => {
          // Удаляем старый курсор если есть
          const oldCursor = document.getElementById('search-page-cursor');
          if (oldCursor) {
            oldCursor.remove();
          }
          
          // Создаем новый видимый курсор
          const cursor = document.createElement('div');
          cursor.id = 'search-page-cursor';
          cursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, #ff0000 0%, #ff0000 30%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            transition: all 0.1s ease;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
            left: 100px;
            top: 100px;
          `;
          document.body.appendChild(cursor);
        });
        
        // Ждем загрузки результатов
        await page.waitForSelector('.serp-item, .organic', { timeout: 10000 });
        
        // Имитируем естественное чтение страницы
        await this.simulateNaturalReading(page, 8000 + Math.random() * 6000); // 8-14 секунд чтения
        
        // Проверяем капчу после изучения страницы
        console.log(`🔍 Проверка капчи после изучения страницы ${currentPage}...`);
        if (this.captchaSolver && typeof this.captchaSolver.checkAndSolveCaptcha === 'function') {
          try {
            const captchaResult = await this.captchaSolver.checkAndSolveCaptcha();
            if (captchaResult && captchaResult.solved) {
              console.log(`✅ Капча решена на странице ${currentPage}`);
              await this.randomDelay(2000, 3000);
            } else {
              console.log(`✅ Капча не обнаружена на странице ${currentPage}`);
            }
          } catch (e) {
            console.log(`⚠️ Ошибка проверки капчи на странице ${currentPage}: ${e.message}`);
          }
        } else {
          console.log(`⚠️ CaptchaSolver не инициализирован или метод недоступен на странице ${currentPage}`);
        }
        
        // Получаем все ссылки на текущей странице
        const links = await page.evaluate((domain) => {
          const results = [];
          const linkElements = document.querySelectorAll('a.Link, a.organic__url, .serp-item a, .organic a');
          
          for (const link of linkElements) {
            const href = link.href;
            const text = link.textContent?.trim() || '';
            
            if (href && href.includes(domain) && href.startsWith('http')) {
              results.push({
                url: href,
                text: text,
                element: link,
                boundingBox: link.getBoundingClientRect()
              });
            }
          }
          
          return results;
        }, targetDomain);
        
        if (links.length > 0) {
          console.log(`✅ Найдено ${links.length} ссылок с доменом ${targetDomain} на странице ${currentPage}`);
          return await this.clickOnFoundLink(page, links[0], targetDomain);
        }
        
        console.log(`❌ Ссылка с доменом ${targetDomain} не найдена на странице ${currentPage}`);
        
        // Если это не последняя страница, переходим на следующую
        if (currentPage < maxPages) {
          console.log(`⏳ Пауза перед переходом на следующую страницу...`);
          await this.randomDelay(2000, 3000); // Пауза между страницами
          
          const nextPageResult = await this.goToNextPage(page, currentPage + 1);
          if (!nextPageResult) {
            console.log(`⚠️ Не удалось перейти на страницу ${currentPage + 1}`);
            break;
          }
        }
      }
      
      console.log(`❌ Ссылка с доменом ${targetDomain} не найдена на всех ${maxPages} страницах`);
      return { found: false, message: `Ссылка не найдена на ${maxPages} страницах` };
      
    } catch (error) {
      console.error('❌ Ошибка поиска по страницам:', error.message);
      return { found: false, message: `Ошибка: ${error.message}` };
    }
  }

  /**
   * Переходит на следующую страницу поиска
   */
  async goToNextPage(page, pageNumber) {
    try {
      console.log(`🔄 Переходим на страницу ${pageNumber}...`);
      
      // Ищем кнопку перехода на следующую страницу
      const nextPageSelector = `a[aria-label="Страница ${pageNumber}"], a.Pager-Item[aria-label="Страница ${pageNumber}"]`;
      
      // Ждем появления кнопки пагинации
      await page.waitForSelector('.Pager-Item, .pager__item', { timeout: 5000 });
      
      // Проверяем, есть ли кнопка для нужной страницы
      const nextPageButton = await page.locator(nextPageSelector).first();
      const isVisible = await nextPageButton.isVisible({ timeout: 2000 });
      
      if (!isVisible) {
        console.log(`❌ Кнопка для страницы ${pageNumber} не найдена`);
        return false;
      }
      
      console.log(`✅ Найдена кнопка для страницы ${pageNumber}`);
      
      // Проверяем и закрываем баннеры перед кликом
      console.log('🎯 Проверяем баннеры перед переходом на следующую страницу...');
      if (this.bannerHandler) {
        const bannerResult = await this.bannerHandler.closeAllBanners();
        if (bannerResult.closed > 0) {
          console.log(`✅ Закрыто ${bannerResult.closed} баннеров перед переходом`);
          await this.randomDelay(1000, 1500);
        }
      }
      
      // Естественный подвод курсора к кнопке пагинации
      const box = await nextPageButton.boundingBox();
      if (box) {
        const targetX = box.x + box.width / 2;
        const targetY = box.y + box.height / 2;
        
        console.log(`🎯 Подводим курсор к кнопке страницы ${pageNumber}: (${Math.round(targetX)}, ${Math.round(targetY)})`);
        
        // Создаем видимый курсор на странице результатов поиска
        await page.evaluate(() => {
          // Удаляем старый курсор если есть
          const oldCursor = document.getElementById('search-page-cursor');
          if (oldCursor) {
            oldCursor.remove();
          }
          
          // Создаем новый видимый курсор
          const cursor = document.createElement('div');
          cursor.id = 'search-page-cursor';
          cursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, #ff0000 0%, #ff0000 30%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            transition: all 0.1s ease;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
          `;
          document.body.appendChild(cursor);
        });
        
        // Создаем SearchPageCursor для естественных движений
        let searchCursor = null;
        try {
          searchCursor = new SearchPageCursor(page);
          await searchCursor.init();
          console.log('✅ SearchPageCursor инициализирован для перехода на страницу');
        } catch (e) {
          console.log('⚠️ Не удалось инициализировать SearchPageCursor:', e.message);
        }
        
        // Естественное движение к кнопке с кривой Безье
        // Используем текущую позицию курсора, а не случайную
        const startX = searchCursor ? searchCursor.currentX : (100 + Math.random() * 200);
        const startY = searchCursor ? searchCursor.currentY : (100 + Math.random() * 200);
        
        console.log(`🎯 Начинаем естественное движение от (${Math.round(startX)}, ${Math.round(startY)}) к (${Math.round(targetX)}, ${Math.round(targetY)})`);
        
        // Создаем контрольные точки для кривой Безье
        const controlX1 = startX + (targetX - startX) * 0.3 + (Math.random() - 0.5) * 100;
        const controlY1 = startY + (targetY - startY) * 0.3 + (Math.random() - 0.5) * 100;
        const controlX2 = startX + (targetX - startX) * 0.7 + (Math.random() - 0.5) * 100;
        const controlY2 = startY + (targetY - startY) * 0.7 + (Math.random() - 0.5) * 100;
        
        const steps = 60; // Больше шагов для более плавной кривой
        
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          
          // Кривая Безье
          const currentX = Math.pow(1-t, 3) * startX + 
                          3 * Math.pow(1-t, 2) * t * controlX1 + 
                          3 * (1-t) * Math.pow(t, 2) * controlX2 + 
                          Math.pow(t, 3) * targetX;
          
          const currentY = Math.pow(1-t, 3) * startY + 
                          3 * Math.pow(1-t, 2) * t * controlY1 + 
                          3 * (1-t) * Math.pow(t, 2) * controlY2 + 
                          Math.pow(t, 3) * targetY;
          
          // Добавляем небольшие случайные отклонения
          const jitterX = (Math.random() - 0.5) * 2;
          const jitterY = (Math.random() - 0.5) * 2;
          
          const finalX = currentX + jitterX;
          const finalY = currentY + jitterY;
          
          await page.mouse.move(finalX, finalY, { steps: 1 });
          
          // Обновляем видимый курсор
          await page.evaluate(({x, y}) => {
            const cursor = document.getElementById('search-page-cursor');
            if (cursor) {
              cursor.style.left = x + 'px';
              cursor.style.top = y + 'px';
            }
          }, {x: finalX, y: finalY});
          
          // Переменная задержка - быстрее в начале, медленнее в конце
          const delay = 30 + (t * 50) + Math.random() * 30;
          await this.randomDelay(delay, delay + 20);
        }
        
        await this.randomDelay(500, 800);
        
        // Кликаем по кнопке
        await nextPageButton.click();
        console.log(`👆 Кликнули по кнопке страницы ${pageNumber}`);
        
        // Ждем загрузки новой страницы (уменьшаем timeout)
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
          
          // Проверяем капчу после перехода на новую страницу
          console.log(`🔍 Проверка капчи после перехода на страницу ${pageNumber}...`);
          if (this.captchaSolver && typeof this.captchaSolver.checkAndSolveCaptcha === 'function') {
            try {
              const captchaResult = await this.captchaSolver.checkAndSolveCaptcha();
              if (captchaResult && captchaResult.solved) {
                console.log(`✅ Капча решена на странице ${pageNumber}`);
                await this.randomDelay(2000, 3000);
              } else {
                console.log(`✅ Капча не обнаружена на странице ${pageNumber}`);
              }
            } catch (e) {
              console.log(`⚠️ Ошибка проверки капчи на странице ${pageNumber}: ${e.message}`);
            }
          } else {
            console.log(`⚠️ CaptchaSolver не инициализирован или метод недоступен на странице ${pageNumber}`);
          }
          
        // Имитируем естественное чтение новой страницы
        await this.simulateNaturalReading(page, 6000 + Math.random() * 4000); // 6-10 секунд чтения
          
          // Обновляем видимый курсор после скролла
          await page.evaluate(() => {
            const cursor = document.getElementById('search-page-cursor');
            if (cursor) {
              cursor.style.left = (100 + Math.random() * 200) + 'px';
              cursor.style.top = (100 + Math.random() * 200) + 'px';
            }
          });
          
          console.log(`✅ Успешно перешли на страницу ${pageNumber} и изучили результаты`);
          return true;
        } catch (e) {
          console.log(`⚠️ Таймаут загрузки страницы ${pageNumber}, но продолжаем...`);
          await this.randomDelay(2000, 3000);
          return true; // Продолжаем работу даже если таймаут
        }
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ Ошибка перехода на страницу ${pageNumber}:`, error.message);
      return false;
    }
  }

  /**
   * Имитирует естественное чтение страницы с реалистичными движениями мыши
   */
  async simulateNaturalReading(page, duration = 8000) {
    try {
      console.log(`📖 Имитируем естественное чтение страницы (${Math.round(duration/1000)} сек)...`);
      
      let searchCursor = null;
      try {
        searchCursor = new SearchPageCursor(page);
        await searchCursor.init();
        console.log('✅ SearchPageCursor инициализирован для чтения');
      } catch (e) {
        console.log('⚠️ Не удалось инициализировать SearchPageCursor:', e.message);
        return;
      }
      
      const startTime = Date.now();
      const endTime = startTime + duration;
      
      // Получаем размеры страницы
      const viewport = page.viewportSize();
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // Получаем текущую позицию курсора
      let currentX = searchCursor.currentX || viewport.width / 2;
      let currentY = searchCursor.currentY || viewport.height / 2;
      
      console.log(`🎯 Начальная позиция курсора: (${Math.round(currentX)}, ${Math.round(currentY)})`);
      
      // Обновляем видимый курсор
      await page.evaluate(({x, y}) => {
        const cursor = document.getElementById('search-page-cursor');
        if (cursor) {
          cursor.style.left = x + 'px';
          cursor.style.top = y + 'px';
        }
      }, {x: currentX, y: currentY});
      
      let currentScroll = 0;
      let actionCount = 0;
      
      // Фаза 1: Быстрый просмотр всех результатов (первые 30% времени)
      const quickScanEndTime = startTime + duration * 0.3;
      console.log(`👀 Фаза 1: Быстрый просмотр результатов...`);
      
      while (Date.now() < quickScanEndTime) {
        actionCount++;
        console.log(`🌊 Быстрый скролл (действие ${actionCount})...`);
        
        // Быстро скроллим вниз
        const scrollAmount = 300 + Math.random() * 400;
        await page.mouse.wheel(0, scrollAmount);
        currentScroll += scrollAmount;
        
        // Небольшие движения мыши во время быстрого скролла
        const moveX = (Math.random() - 0.5) * 200;
        const moveY = (Math.random() - 0.5) * 100;
        currentX = Math.max(150, Math.min(viewport.width - 150, currentX + moveX));
        currentY = Math.max(150, Math.min(viewport.height - 150, currentY + moveY));
        
        await searchCursor.moveSmooth(searchCursor.currentX, searchCursor.currentY, currentX, currentY, 200);
        searchCursor.currentX = currentX;
        searchCursor.currentY = currentY;
        
        await this.randomDelay(300, 600);
      }
      
      // Возвращаемся к началу для внимательного чтения
      console.log(`🔄 Возвращаемся к началу для внимательного чтения...`);
      const returnScroll = currentScroll * 0.8;
      await page.mouse.wheel(0, -returnScroll);
      currentScroll -= returnScroll;
      
      // Фаза 2: Внимательное чтение заголовков (оставшиеся 70% времени)
      console.log(`📖 Фаза 2: Внимательное чтение заголовков...`);
      
      while (Date.now() < endTime) {
        actionCount++;
        
        // Имитируем чтение заголовков - движения мыши к тексту
        console.log(`📝 Читаем заголовок (действие ${actionCount})...`);
        
        // Движения в области заголовков (левая часть экрана)
        const textMovements = 2 + Math.random() * 3;
        for (let i = 0; i < textMovements; i++) {
          // Движения в области текста результатов поиска
          const targetX = 200 + Math.random() * 600; // Левая часть экрана
          const targetY = 200 + Math.random() * 400; // Область заголовков
          
          await searchCursor.moveSmooth(searchCursor.currentX, searchCursor.currentY, targetX, targetY, 600 + Math.random() * 400);
          searchCursor.currentX = targetX;
          searchCursor.currentY = targetY;
          
          // Пауза для "чтения" заголовка
          await this.randomDelay(800, 1500);
        }
        
        // Иногда скроллим немного вниз для следующего заголовка
        if (Math.random() < 0.4) {
          console.log(`📜 Переходим к следующему заголовку...`);
          const smallScroll = 100 + Math.random() * 200;
          await page.mouse.wheel(0, smallScroll);
          currentScroll += smallScroll;
          
          // Движение мыши при переходе к следующему заголовку
          const moveX = (Math.random() - 0.5) * 150;
          currentX = Math.max(150, Math.min(viewport.width - 150, currentX + moveX));
          
          await searchCursor.moveSmooth(searchCursor.currentX, searchCursor.currentY, currentX, currentY, 300);
          searchCursor.currentX = currentX;
          searchCursor.currentY = currentY;
          
          await this.randomDelay(400, 800);
        }
        
        // Пауза между заголовками
        await this.randomDelay(1000, 2000);
        
        // Если доскроллили далеко, возвращаемся к началу
        if (currentScroll > pageHeight * 0.6) {
          console.log(`🔄 Возвращаемся к началу для повторного просмотра...`);
          
          const returnScroll = currentScroll * 0.7;
          await page.mouse.wheel(0, -returnScroll);
          currentScroll -= returnScroll;
          
          // Движение мыши при возврате
          const moveX = (Math.random() - 0.5) * 200;
          currentX = Math.max(150, Math.min(viewport.width - 150, currentX + moveX));
          
          await searchCursor.moveSmooth(searchCursor.currentX, searchCursor.currentY, currentX, currentY, 400);
          searchCursor.currentX = currentX;
          searchCursor.currentY = currentY;
          
          await this.randomDelay(1500, 2500);
        }
      }
      
      console.log(`✅ Естественное чтение завершено (${actionCount} действий)`);
      
    } catch (error) {
      console.error('❌ Ошибка имитации чтения:', error.message);
    }
  }

  /**
   * Кликает по найденной ссылке с естественным поведением
   */
  async clickOnFoundLink(page, targetLink, targetDomain) {
    try {
      console.log(`🎯 Выбрана ссылка: ${targetLink.url}`);
      
      // Вычисляем координаты цели
      const targetX = targetLink.boundingBox.x + targetLink.boundingBox.width / 2;
      const targetY = targetLink.boundingBox.y + targetLink.boundingBox.height / 2;
      
      // Имитируем естественное поведение перед кликом
      console.log('🎭 Имитируем естественное поведение на странице поиска...');
      
      // Используем специальные классы для страницы поиска
      console.log('🎯 Инициализируем SearchPageCursor для страницы результатов...');
      let searchCursor = null;
      try {
        // Создаем SearchPageCursor для страницы результатов
        searchCursor = new SearchPageCursor(page);
        await searchCursor.init();
        
        // Создаем SearchPageScroll для страницы результатов
        const searchScroll = new SearchPageScroll(page, searchCursor);
        
        console.log('✅ SearchPageCursor и SearchPageScroll готовы');
        
        // Используем SearchPageCursor для естественного поведения
        console.log('🔍 Изучаем результаты поиска с SearchPageCursor...');
        await searchCursor.exploreRandomly(2);
        
        // Сначала скроллим к ссылке, чтобы она была видна
        console.log('🔄 Скроллим к ссылке, чтобы она была видна...');
        await searchScroll.scrollToElement(`a[href*="${targetDomain}"]`, { position: 'center' });
        await this.randomDelay(500, 800);
        
        // Обновляем позицию курсора после скролла
        console.log('🔄 Обновляем позицию курсора после скролла...');
        const element = page.locator(`a[href*="${targetDomain}"]`).first();
        const box = await element.boundingBox();
        if (box) {
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          
          // Сначала перемещаем реальную мышь к центру элемента
          await page.mouse.move(centerX, centerY, { steps: 10 });
          
          // Затем обновляем позицию курсора в объекте
          searchCursor.currentX = centerX;
          searchCursor.currentY = centerY;
          
          // И обновляем видимый курсор
          await page.evaluate(({x, y}) => {
            const cursor = document.getElementById('search-page-cursor');
            if (cursor) {
              cursor.style.left = x + 'px';
              cursor.style.top = y + 'px';
            }
          }, {x: centerX, y: centerY});
          
          console.log(`🎯 Курсор синхронизирован: реальная мышь и видимый курсор в позиции (${Math.round(centerX)}, ${Math.round(centerY)})`);
        }
        
        console.log('📖 Имитируем чтение найденной ссылки...');
        await searchCursor.readText('title', 1500);
        
        // Дополнительное естественное поведение - изучаем результаты поиска
        console.log('🔍 Изучаем результаты поиска более детально...');
        await searchCursor.exploreRandomly(3);
        
        // Небольшой скролл для изучения других результатов
        console.log('🌊 Скроллим для изучения других результатов...');
        await searchScroll.smoothScroll('down', 300);
        await this.randomDelay(800, 1200);
        
        // Возвращаемся к нашей ссылке
        console.log('🔄 Возвращаемся к нужной ссылке...');
        await searchScroll.scrollToElement(`a[href*="${targetDomain}"]`, { position: 'center' });
        await this.randomDelay(500, 800);
        
        console.log('✅ Естественное поведение выполнено с SearchPageCursor');
        
      } catch (e) {
        console.log('⚠️ Ошибка с нашими классами:', e.message);
        // Fallback к простым движениям
        console.log('🔄 Используем простые движения...');
        await page.mouse.move(400, 300, { steps: 50 });
        await this.randomDelay(800, 1200);
        await page.mouse.move(600, 400, { steps: 40 });
        await this.randomDelay(600, 900);
      }
      
    // Получаем актуальные координаты ссылки после скролла
    const element = page.locator(`a[href*="${targetDomain}"]`).first();
    const currentBox = await element.boundingBox();
    if (currentBox) {
      const currentTargetX = currentBox.x + currentBox.width / 2;
      const currentTargetY = currentBox.y + currentBox.height / 2;
      
      console.log(`🎯 Финальный подвод курсора к ссылке: (${Math.round(currentTargetX)}, ${Math.round(currentTargetY)})`);
      
      if (searchCursor) {
        try {
          // Естественное движение к ссылке с небольшими отклонениями
          console.log('🎯 Начинаем естественный подвод к ссылке...');
          
          // Сначала двигаемся в сторону ссылки, но не точно к ней
          const offsetX = (Math.random() - 0.5) * 50;
          const offsetY = (Math.random() - 0.5) * 30;
          const intermediateX = currentTargetX + offsetX;
          const intermediateY = currentTargetY + offsetY;
          
          // Двигаемся к промежуточной точке
          await searchCursor.moveSmooth(searchCursor.currentX, searchCursor.currentY, intermediateX, intermediateY, 1000);
          await this.randomDelay(300, 500);
          
          // Затем точно к ссылке
          await searchCursor.moveSmooth(intermediateX, intermediateY, currentTargetX, currentTargetY, 800);
          
          // Финальная пауза перед кликом
          await this.randomDelay(500, 800);
          
          console.log('✅ Курсор подведен к ссылке с SearchPageCursor');
        } catch (e) {
          console.log('⚠️ Не удалось подвести курсор с SearchPageCursor:', e.message);
          // Fallback к простому движению
          try {
            await page.mouse.move(currentTargetX, currentTargetY, { steps: 20 });
            await this.randomDelay(500, 800);

            console.log('✅ Курсор подведен простым способом');
          } catch (e2) {
            console.log('⚠️ Не удалось подвести курсор, используем прямой клик');
          }
        }
      } else {
        console.log('⚠️ SearchPageCursor не инициализирован, используем простой подвод');
        try {
          await page.mouse.move(currentTargetX, currentTargetY, { steps: 20 });
          await this.randomDelay(500, 800);

          console.log('✅ Курсор подведен простым способом');
        } catch (e) {
          console.log('⚠️ Не удалось подвести курсор, используем прямой клик');
        }
      }
      
      // Кликаем по актуальным координатам ссылки
      console.log('👆 Кликаем по ссылке...');
      
      // Сначала нажимаем кнопку мыши
      await page.mouse.down();
      await this.randomDelay(50, 100);
      
      // Затем отпускаем
      await page.mouse.up();
      await this.randomDelay(100, 200);
    } else {
      console.log('⚠️ Не удалось получить координаты ссылки');
    }
      
      // Ждем загрузки новой страницы
      await this.randomDelay(2000, 3000);
      
      console.log(`✅ Успешно перешли по ссылке: ${targetLink.url}`);
      
      return { 
        found: true, 
        url: targetLink.url, 
        text: targetLink.text,
        message: 'Успешно перешли по ссылке'
      };
      
    } catch (error) {
      console.error('❌ Ошибка клика по ссылке:', error.message);
      return { found: false, error: error.message };
    }
  }

  /**
   * Собирает ссылки из результатов поиска
   */
  async getSearchResults(page) {
    try {
      console.log('📋 Собираем результаты поиска...');
      
      // Получаем все открытые страницы и ищем страницу с результатами поиска
      const pages = page.context().pages();
      let resultsPage = null;
      
      for (const p of pages) {
        try {
          const url = p.url();
          if (url.includes('/search/') && url.includes('text=')) {
            resultsPage = p;
            console.log(`✅ Найдена страница с результатами: ${url}`);
            break;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
      
      if (!resultsPage) {
        console.log('⚠️ Страница с результатами не найдена, используем текущую страницу');
        resultsPage = page;
      }
      
      // Ждем загрузки результатов
      await resultsPage.waitForSelector('.serp-item, .organic', { timeout: 10000 });
      
      // Получаем все ссылки
      const links = await resultsPage.evaluate(() => {
        const results = [];
        const linkElements = document.querySelectorAll('a.Link, a.organic__url, .serp-item a, .organic a');
        
        for (const link of linkElements) {
          const href = link.href;
          const text = link.textContent?.trim() || '';
          
          // Игнорируем все ссылки Яндекса и социальных сетей, оставляем только внешние
          if (href && 
              !href.includes('yandex.ru') && 
              !href.includes('images.yandex.ru') && 
              !href.includes('dzen.ru') && 
              !href.includes('translate.yandex') &&
              !href.includes('yabs.yandex.ru/count') &&
              !href.includes('rutube.ru') &&
              !href.includes('ok.ru') &&
              !href.includes('ya.ru') &&
              !href.includes('youtube.com') &&
              !href.includes('vkontakte.ru') &&
              !href.includes('vk.com') &&
              !href.includes('vk.ru') &&
              !href.includes('google.ru') &&
              !href.includes('www.bing.com') &&
              href.startsWith('http')) {
            results.push({
              url: href,
              text: text,
              title: link.title || '',
              className: link.className
            });
          }
        }
        
        return results;
      });
      
      // Фильтруем уникальные ссылки
      const uniqueLinks = [];
      const seenUrls = new Set();
      
      for (const link of links) {
        if (!seenUrls.has(link.url) && link.url.startsWith('http')) {
          seenUrls.add(link.url);
          uniqueLinks.push(link);
        }
      }
      
      return uniqueLinks;
      
    } catch (error) {
      console.error('❌ Ошибка сбора результатов:', error.message);
      return [];
    }
  }
}

// ========================================
// ИСПОЛЬЗОВАНИЕ
// ========================================

// Проверяем, запущен ли файл напрямую
console.log('🔍 Проверяем условия запуска...');
console.log('process.argv[1]:', process.argv[1]);
console.log('import.meta.url:', import.meta.url);

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  console.log('🚀 PF-Serfer запускается...');
  
  const args = process.argv.slice(2);
  const profileName = args[0];

  if (!profileName) {
    console.log('❌ Укажите имя профиля!');
    console.log('Использование: node pf-serfer.js <профиль> [опции]');
    console.log('Примеры:');
    console.log('  node pf-serfer.js bot-123456789');
    console.log('  node pf-serfer.js bot-123456789 --proxy');
    console.log('  node pf-serfer.js bot-123456789 --no-auto-captcha');
    console.log('  node pf-serfer.js bot-123456789 --movement-speed=slow');
    console.log('  node pf-serfer.js bot-123456789 --yandex-rules');
    console.log('  node pf-serfer.js bot-123456789 --nervous-movements');
    console.log('  node pf-serfer.js bot-123456789 --no-auto-check-captcha');
    process.exit(1);
  }
  
  console.log(`📋 Профиль: ${profileName}`);

  // Парсим опции
  const options = {
    useProxy: false,
    enableAutoSolve: true,
    enableAutoCheck: true, // Автоматическая проверка капчи после действий
    enableIdleJitter: true,
    enableNervousMovements: false, // Отключено по умолчанию (только для капчи)
    enableReadingSimulation: true,
    enableRandomExploration: true,
    movementSpeed: 'medium',
    useYandexRules: false
  };

  // Парсим прокси
  if (args.includes('--proxy')) {
    options.useProxy = true;
  }

  // Парсим авторешение капчи
  if (args.includes('--no-auto-captcha')) {
    options.enableAutoSolve = false;
  }

  // Парсим автоматическую проверку капчи
  if (args.includes('--no-auto-check-captcha')) {
    options.enableAutoCheck = false;
  }

  // Парсим правила блокировки для Яндекс
  if (args.includes('--yandex-rules')) {
    options.useYandexRules = true;
  }

  // Парсим нервные движения (только для капчи)
  if (args.includes('--nervous-movements')) {
    options.enableNervousMovements = true;
  }

  // Парсим скорость движений
  const speedArg = args.find(arg => arg.startsWith('--movement-speed='));
  if (speedArg) {
    const speed = speedArg.split('=')[1];
    if (['slow', 'medium', 'fast'].includes(speed)) {
      options.movementSpeed = speed;
    }
  }

  // Создаем и запускаем PF-Serfer
  const pfSerfer = new PFSerfer(profileName, options);
  
  // Пример использования
  (async () => {
    try {
      const browser = await pfSerfer.start();
      
      // Тестируем на простой странице
      await browser.navigateToPage('https://dzen.ru/?yredirect=true');
      
      console.log(`\n🎉 Тест завершен! Курсор и скролл работают.`);
      
      // Оставляем браузер открытым для демонстрации
      console.log('\n💡 Браузер оставлен открытым для демонстрации');
      console.log('💡 Используйте методы browser.* для взаимодействия');
      console.log('💡 Вызовите browser.close() для завершения работы\n');
      
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
      process.exit(1);
    }
  })();
}

// Экспортируем класс для использования в других модулях
export { PFSerfer };
