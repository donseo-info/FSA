import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ScreenSpoof, LanguageSpoof, HardwareSpoof, WebRTCSpoof, WebGLSpoof, CanvasSpoof, AudioSpoof, SeoGoogleSpoof, RealPluginSpoof } from '../spoofs/index.js';
import { ProfileGenerator } from '../managers/ProfileGenerator.js';

/**
 * Главный контроллер браузера
 */
class BrowserController {
  constructor(profileName, options = {}) {
    this.profileName = profileName;
    this.port = options.port || 9222;
    this.proxy = options.proxy || null;
    this.enablePlugins = options.enablePlugins !== false; // по умолчанию включены
    
    // Загружаем конфиг профиля
    const generator = new ProfileGenerator();
    this.config = generator.getOrCreateProfile(profileName);
    
    this.chromePath = this.config.chromePath;
    this.profilePath = path.resolve(`./profiles/${this.profileName}`);
    
    // Инициализируем спуфы
    this.spoofs = this.initializeSpoofs();
    
    // Настройка блокировки ресурсов
    this.enableResourceBlocking = options.enableResourceBlocking !== false; // по умолчанию включено
    this.blockingConfig = options.blockingConfig || {
      useYandexRules: false,
      blockRulesFile: 'block-rules.txt',
      allowRulesFile: 'allow-rules.txt'
    };
    
    // Загружаем правила блокировки только если включена блокировка
    if (this.enableResourceBlocking) {
      this.blockRules = this.loadBlockRules();
      this.allowRules = this.loadAllowRules();
    } else {
      this.blockRules = [];
      this.allowRules = [];
    }
    
    this.chromeProcess = null;
    this.browser = null;
    this.context = null;
  }

  /**
   * Инициализирует все спуфы
   */
  initializeSpoofs() {
    const spoofs = {
      screen: new ScreenSpoof(this.config.resolution),
      language: new LanguageSpoof({
        locale: this.config.locale,
        languages: this.config.languages,
        acceptLanguage: this.config.acceptLanguage
      }),
      hardware: new HardwareSpoof({
        cores: this.config.hardware.cores,
        memory: this.config.hardware.memory
      }),
      webgl: new WebGLSpoof({
        gpu: {
          vendor: this.config.webgl.vendor,
          renderer: this.config.webgl.renderer
        },
        seed: this.config.webgl.seed
      }),
      canvas: new CanvasSpoof({
        seed: this.config.webgl.seed
      }),
      audio: new AudioSpoof({
        seed: this.config.webgl.seed
      }),
      seoGoogle: new SeoGoogleSpoof({
        profilePath: this.profilePath
      }),
      // Плагины будут загружаться динамически из конфига профиля
    };

    // WebRTC только если есть прокси
    if (this.proxy) {
      const proxyIP = this.extractProxyIP();
      if (proxyIP) {
        // Новый формат WebRTCSpoof
        spoofs.webrtc = new WebRTCSpoof({
          ip: proxyIP,
          profilePath: this.profilePath
        });
      } else {
        console.warn('⚠️ WebRTC: Не удалось извлечь IP из прокси');
      }
    }

    return spoofs;
  }

  /**
   * Загружает правила блокировки из файла
   */
  loadBlockRules() {
    if (!this.blockingConfig || !this.blockingConfig.blockRulesFile) {
      return [];
    }
    try {
      const blockPath = path.resolve(this.blockingConfig.blockRulesFile);
      const content = fs.readFileSync(blockPath, 'utf-8');
      return content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(pattern => this.patternToRegex(pattern));
    } catch (error) {
      console.warn('⚠️ Не удалось загрузить правила блокировки:', error.message);
      return [];
    }
  }

  /**
   * Загружает правила разрешения из файла
   */
  loadAllowRules() {
    try {
      if (!this.blockingConfig || !this.blockingConfig.allowRulesFile) {
        return [];
      }
      const allowPath = path.resolve(this.blockingConfig.allowRulesFile);
      const content = fs.readFileSync(allowPath, 'utf-8');
      return content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(pattern => this.patternToRegex(pattern));
    } catch (error) {
      console.warn('⚠️ Не удалось загрузить правила разрешения:', error.message);
      return [];
    }
  }

  /**
   * Преобразует паттерн в регулярное выражение
   */
  patternToRegex(pattern) {
    // Сначала заменяем * на .*, затем экранируем остальные специальные символы
    let regex = pattern
      .replace(/\*/g, '.*')  // Заменяем * на .*
      .replace(/[.+^${}()|[\]\\]/g, '\\$&'); // Экранируем остальные символы
    
    // Обрабатываем специальные случаи
    regex = regex
      .replace(/\\\.\\\*/g, '.*')  // Восстанавливаем .* после экранирования
      .replace(/\\\+/g, '\\+')     // Экранируем +
      .replace(/\\"/g, '"');       // Убираем экранирование кавычек
    
    return new RegExp(regex, 'i');
  }

  /**
   * Проверяет, должен ли ресурс быть заблокирован
   */
  shouldBlockResource(url) {
    // Сначала проверяем правила разрешения
    for (const allowRule of this.allowRules) {
      if (allowRule.test(url)) {
        return false; // Разрешаем
      }
    }
    
    // Затем проверяем правила блокировки
    for (const blockRule of this.blockRules) {
      if (blockRule.test(url)) {
        return true; // Блокируем
      }
    }
    
    return false; // По умолчанию разрешаем
  }

  /**
   * Загружает плагины из конфига профиля
   */
  loadProfilePlugins(extensions) {
    if (!this.enablePlugins) {
      console.log(`🔌 Загрузка плагинов отключена`);
      return;
    }
    
    if (this.config.plugins && Array.isArray(this.config.plugins)) {
      console.log(`🔌 Загружаем ${this.config.plugins.length} плагинов из конфига профиля`);
      
      for (const plugin of this.config.plugins) {
        if (plugin.enabled && plugin.path) {
          console.log(`🔌 Загружаем плагин: ${plugin.name} v${plugin.version} (${plugin.id})`);
          extensions.push(plugin.path);
        }
      }
    } else {
      console.log(`🔌 Плагины в конфиге профиля не найдены`);
    }
  }

  /**
   * Настраивает блокировку URL плагинов
   */
  async setupPluginBlocking(page) {
    try {
      // Блокируем chrome-extension URL
      await page.route('chrome-extension://**', (route) => {
        const url = route.request().url();
        // Блокируем URL плагина
        route.abort('blockedbyclient');
      });
      
      // Блокируем moz-extension URL (для Firefox)
      await page.route('moz-extension://**', (route) => {
        const url = route.request().url();
        // Блокируем URL плагина
        route.abort('blockedbyclient');
      });
      
      // Блокируем edge-extension URL (для Edge)
      await page.route('ms-browser-extension://**', (route) => {
        const url = route.request().url();
        // Блокируем URL плагина
        route.abort('blockedbyclient');
      });
      
      // Блокируем конкретные страницы плагинов
      await page.route('**/installed.html', (route) => {
        const url = route.request().url();
        // Блокируем страницу установки
        route.abort('blockedbyclient');
      });
      
      await page.route('**/welcome.html', (route) => {
        const url = route.request().url();
        // Блокируем приветственную страницу
        route.abort('blockedbyclient');
      });
      
      await page.route('**/onboarding.html', (route) => {
        const url = route.request().url();
        // Блокируем страницу онбординга
        route.abort('blockedbyclient');
      });
      
      // Блокировка URL плагинов настроена
    } catch (error) {
      console.log(`⚠️ Ошибка настройки блокировки плагинов: ${error.message}`);
    }
  }

  /**
   * Извлекает IP из прокси
   */
  extractProxyIP() {
    if (!this.proxy || !this.proxy.server) return null;
    
    try {
      let serverStr = this.proxy.server.replace(/^(https?|socks[45]?):\/\//, '');
      
      if (serverStr.includes('@')) {
        serverStr = serverStr.split('@')[1];
      }
      
      const host = serverStr.split(':')[0];
      
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        return host;
      }
      
      console.warn('⚠️ Прокси использует домен, WebRTC не будет защищен');
      return null;
      
    } catch (error) {
      console.error('❌ Ошибка парсинга IP прокси:', error.message);
      return null;
    }
  }

  /**
   * Проверяет доступность порта
   */
  async checkPort(maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const testBrowser = await chromium.connectOverCDP(`http://localhost:${this.port}`);
        console.log(`⚠️ Chrome уже запущен на порту ${this.port}, закрываем...`);
        await testBrowser.close();
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Порт освобожден');
        return true;
      } catch (e) {
        if (attempt === 1) {
          console.log(`✅ Порт ${this.port} свободен`);
        }
        return true;
      }
    }
    throw new Error(`Не удалось освободить порт ${this.port}`);
  }

  /**
   * Запускает Chrome
   */
  async launch() {
    console.log(`\n🚀 Запуск Chrome для профиля: ${this.profileName}`);
    console.log(`🖥️ Устройство: ${this.config.deviceName || 'Custom'}`);
    console.log(`📂 Chrome: ${this.chromePath}`);
    // Конфигурация спуфов загружена
    
    if (this.proxy) {
      console.log(`🔗 Прокси: ${this.proxy.server}`);
    }

    await this.checkPort();

    const chromeArgs = [
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.profilePath}`,
      `--window-size=${this.config.resolution.width},${this.config.resolution.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=DisableLoadExtensionCommandLineSwitch'
    ];

    // Добавляем прокси
    if (this.proxy && this.proxy.server) {
      chromeArgs.push(`--proxy-server=${this.proxy.server}`);
    }

    // Создаем и загружаем расширения
    const extensions = [];
    
    // WebRTC расширение - только когда используется прокси
    if (this.proxy && this.proxy.server && this.spoofs.webrtc) {
      const extensionPath = this.spoofs.webrtc.createExtension();
      if (extensionPath) {
        extensions.push(extensionPath);
        console.log(`🔌 Загружаем WebRTC расширение для прокси`);
      }
    }
    
    // Загружаем только WebRTC расширение
    if (extensions.length > 0) {
      const extensionArg = `--load-extension=${extensions.join(',')}`;
      console.log(`🔌 Загружаем расширения: ${extensionArg}`);
      chromeArgs.push(extensionArg);
    } else {
      console.log(`🔌 Расширения не загружаются`);
    }

    // Добавляем только безопасные аргументы
    chromeArgs.push('--disable-notifications');
    chromeArgs.push('--disable-popup-blocking');
    chromeArgs.push('--disable-features=TranslateUI');

    this.chromeProcess = spawn(this.chromePath, chromeArgs, {
      detached: true,
      stdio: 'ignore'
    });
    
    this.chromeProcess.unref();
    console.log('⏳ Запуск Chrome...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }


  /**
   * Подключается к Chrome через CDP
   */
  async connect() {
    console.log('🔗 Подключение через CDP...');
    
    this.browser = await chromium.connectOverCDP(`http://localhost:${this.port}`);
    this.context = this.browser.contexts()[0];
    
    // Блокируем попапы и новые окна (но не наши собственные страницы и не Яндекс)
        this.context.on('page', (page) => {
          // Даем странице время инициализироваться
          setTimeout(async () => {
            try {
              const url = page.url();
              // Разрешаем все переходы с Яндекса и наши собственные страницы
              if (url === 'about:blank' || 
                  url.startsWith('chrome-extension://') ||
                  url.includes('yandex.ru') ||
                  url.includes('dzen.ru') ||
                  // Если это внешняя ссылка (не Яндекс), разрешаем её
                  (!url.includes('yandex.ru') && !url.includes('dzen.ru') && url.startsWith('http'))) {
                console.log(`✅ Разрешаем переход: ${url}`);
              } else {
                console.log(`🚫 Блокируем попап: ${url}`);
                await page.close();
              }
            } catch (error) {
              // Игнорируем ошибки закрытия
            }
          }, 100);
        });
    
    const existingPages = this.context.pages();
    console.log(`📄 Найдено страниц: ${existingPages.length}`);
    
    // Применяем спуфы к существующим страницам
    for (const page of existingPages) {
      await this.applySpoofs(page);
      await this.setupPluginBlocking(page);
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
      } catch (e) {
        // Игнорируем ошибки перезагрузки
      }
    }
    
    // Автоматически применяем спуфы к новым страницам
    this.context.on('page', async (page) => {
      // Новая страница обнаружена
      await page.waitForTimeout(100);
      
      // Проверяем, не является ли это страницей плагина
      const url = page.url();
      // Проверяем URL новой страницы
      
      if (url.includes('chrome-extension://') || url.includes('installed.html') || url.includes('welcome.html') || url.includes('onboarding.html')) {
        // Обнаружена страница плагина, закрываем
        try {
          await page.close();
          // Страница плагина закрыта
          return;
        } catch (error) {
          console.log(`⚠️ Ошибка закрытия страницы плагина: ${error.message}`);
        }
      } else {
        // Обычная страница, продолжаем обработку
      }
      
      await this.applySpoofs(page);
      
      // Блокируем URL плагинов
      await this.setupPluginBlocking(page);
      
      // Применяем спуфы к новым фреймам
      page.on('frameattached', async (frame) => {
        await this.applySpoofsToFrame(frame);
      });
    });
    
    console.log('✅ Подключение установлено\n');
    
    return { browser: this.browser, context: this.context };
  }

  /**
   * Применяет все спуфы к странице
   */
  async applySpoofs(page) {
    // Блокируем попапы и новые окна через JavaScript
    try {
      await page.evaluate(() => {
        // Блокируем window.open
        window.open = function() {
          console.log('🚫 Блокирован window.open');
          return null;
        };
        
        // Блокируем создание новых окон
        const originalAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
          if (type === 'beforeunload' || type === 'unload') {
            return;
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
        
        // Блокируем alert, confirm, prompt
        window.alert = function() { console.log('🚫 Блокирован alert'); };
        window.confirm = function() { console.log('🚫 Блокирован confirm'); return false; };
        window.prompt = function() { console.log('🚫 Блокирован prompt'); return null; };
      });
    } catch (error) {
      // Игнорируем ошибки если контекст был уничтожен
      if (!error.message.includes('Execution context was destroyed')) {
        console.warn('⚠️ Ошибка применения блокировки попапов:', error.message);
      }
    }

    const spoofs = [
      { name: 'ScreenSpoof', spoof: this.spoofs.screen },
      { name: 'LanguageSpoof', spoof: this.spoofs.language },
      { name: 'HardwareSpoof', spoof: this.spoofs.hardware },
      { name: 'WebGLSpoof', spoof: this.spoofs.webgl },
      { name: 'CanvasSpoof', spoof: this.spoofs.canvas },
      { name: 'AudioSpoof', spoof: this.spoofs.audio }
    ];
    
    for (const { name, spoof } of spoofs) {
      try {
        await spoof.apply(page);
      } catch (error) {
        console.log(`⚠️ Ошибка применения спуфа ${name}: ${error.message}`);
      }
    }
    
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    // Настраиваем блокировку ресурсов
    await this.setupResourceBlocking(page);
  }

  /**
   * Настраивает блокировку ресурсов на странице
   */
  async setupResourceBlocking(page) {
    if (!this.enableResourceBlocking) {
      console.log('🛡️ Блокировка ресурсов отключена');
      return;
    }
    
    try {
      // Включаем блокировку запросов через CDP
      await page.route('**/*', (route) => {
        const url = route.request().url();
        
              if (this.shouldBlockResource(url)) {
                route.abort();
              } else {
                route.continue();
              }
      });
      
      console.log(`🛡️ Блокировка ресурсов настроена (${this.blockRules.length} правил блокировки, ${this.allowRules.length} правил разрешения)`);
    } catch (error) {
      console.warn('⚠️ Ошибка настройки блокировки ресурсов:', error.message);
    }
  }

  /**
   * Применяет спуфы к фрейму
   */
  async applySpoofsToFrame(frame) {
    try {
      // Проверяем, что фрейм не отсоединен
      if (frame.isDetached()) {
        // Фрейм отсоединен, пропускаем (нормальное поведение)
        return;
      }
      
      const frameUrl = frame.url();
      
      // Применяем каждый спуф отдельно для избежания синтаксических ошибок
      const spoofs = [
        this.spoofs.screen,
        this.spoofs.language,
        this.spoofs.hardware,
        this.spoofs.webgl,
        this.spoofs.canvas,
        this.spoofs.audio
      ];
      
      for (const spoof of spoofs) {
        try {
          // Дополнительная проверка перед каждым спуфом
          if (frame.isDetached()) {
            // Фрейм отсоединен (нормальное поведение)
            break;
          }
          await frame.evaluate(spoof.getInjectionCode());
        } catch (spoofError) {
          // Фрейм отсоединен во время применения спуфа (нормальное поведение)
        }
      }
      
      // Спуфы применены к фрейму
    } catch (error) {
      console.log(`⚠️ Ошибка применения спуфов к фрейму: ${error.message}`);
    }
  }

  /**
   * Создает новую страницу с подменами
   */
  async newPage() {
    const page = await this.context.newPage();
    
    // Устанавливаем размер viewport из конфигурации профиля
    const { width, height } = this.config.resolution;
    await page.setViewportSize({ width, height });
    
    await this.applySpoofs(page);
    console.log(`\n📄 Новая страница создана (${width}x${height})\n`);
    return page;
  }

  /**
   * Закрывает браузер
   */
  async close() {
    console.log('\n🛑 Закрытие браузера...');
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Браузер закрыт');
      }
      if (this.chromeProcess && !this.chromeProcess.killed) {
        this.chromeProcess.kill('SIGTERM');
        console.log('✅ Процесс Chrome завершен');
      }
    } catch (error) {
      console.error('❌ Ошибка при закрытии:', error.message);
    }
  }
}

export { BrowserController };