import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
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
        console.log(`🚫 Блокируем URL плагина: ${url}`);
        route.abort('blockedbyclient');
      });
      
      // Блокируем moz-extension URL (для Firefox)
      await page.route('moz-extension://**', (route) => {
        const url = route.request().url();
        console.log(`🚫 Блокируем URL плагина: ${url}`);
        route.abort('blockedbyclient');
      });
      
      // Блокируем edge-extension URL (для Edge)
      await page.route('ms-browser-extension://**', (route) => {
        const url = route.request().url();
        console.log(`🚫 Блокируем URL плагина: ${url}`);
        route.abort('blockedbyclient');
      });
      
      // Блокируем конкретные страницы плагинов
      await page.route('**/installed.html', (route) => {
        const url = route.request().url();
        console.log(`🚫 Блокируем страницу установки: ${url}`);
        route.abort('blockedbyclient');
      });
      
      await page.route('**/welcome.html', (route) => {
        const url = route.request().url();
        console.log(`🚫 Блокируем приветственную страницу: ${url}`);
        route.abort('blockedbyclient');
      });
      
      await page.route('**/onboarding.html', (route) => {
        const url = route.request().url();
        console.log(`🚫 Блокируем страницу онбординга: ${url}`);
        route.abort('blockedbyclient');
      });
      
      console.log('🚫 Блокировка URL плагинов настроена');
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
    console.log(`📐 Разрешение: ${this.config.resolution.width}x${this.config.resolution.height}`);
    console.log(`🗣️ Язык: ${this.config.locale}`);
    console.log(`💻 Железо: ${this.config.hardware.cores} ядер, ${this.config.hardware.memory} GB`);
    console.log(`🎮 GPU: ${this.config.webgl.renderer}`);
    
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
    
    // WebRTC расширение
    if (this.spoofs.webrtc) {
      const extensionPath = this.spoofs.webrtc.createExtension();
      if (extensionPath) {
        extensions.push(extensionPath);
      }
    }
    
    // SEO Google расширение
    if (this.enablePlugins && this.spoofs.seoGoogle) {
      const extensionPath = this.spoofs.seoGoogle.createExtension();
      if (extensionPath) {
        extensions.push(extensionPath);
      }
    }
    
    // Плагины теперь загружаются из конфига профиля
    
    // Загружаем плагины из конфига профиля
    this.loadProfilePlugins(extensions);
    
    // Загружаем все расширения
    if (extensions.length > 0) {
      const extensionArg = `--load-extension=${extensions.join(',')}`;
      console.log(`🔌 Загружаем расширения: ${extensionArg}`);
      chromeArgs.push(extensionArg);
    }

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
      console.log('📄 Новая страница обнаружена');
      await page.waitForTimeout(100);
      
      // Проверяем, не является ли это страницей плагина
      const url = page.url();
      console.log(`🔍 Проверяем URL новой страницы: ${url}`);
      
      if (url.includes('chrome-extension://') || url.includes('installed.html') || url.includes('welcome.html') || url.includes('onboarding.html')) {
        console.log(`🚫 Обнаружена страница плагина, закрываем: ${url}`);
        try {
          await page.close();
          console.log(`✅ Страница плагина успешно закрыта`);
          return;
        } catch (error) {
          console.log(`⚠️ Ошибка закрытия страницы плагина: ${error.message}`);
        }
      } else {
        console.log(`✅ Обычная страница, продолжаем обработку`);
      }
      
      await this.applySpoofs(page);
      
      // Блокируем URL плагинов
      await this.setupPluginBlocking(page);
      
      // Применяем спуфы к новым фреймам
      page.on('frameattached', async (frame) => {
        console.log('🖼️ Новый фрейм обнаружен');
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
  }

  /**
   * Применяет спуфы к фрейму
   */
  async applySpoofsToFrame(frame) {
    try {
      // Проверяем, что фрейм не отсоединен
      if (frame.isDetached()) {
        console.log('⚠️ Фрейм отсоединен, пропускаем применение спуфов');
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
            console.log('⚠️ Фрейм отсоединен во время применения спуфов');
            break;
          }
          await frame.evaluate(spoof.getInjectionCode());
        } catch (spoofError) {
          console.log(`⚠️ Ошибка применения спуфа ${spoof.constructor.name}: ${spoofError.message}`);
        }
      }
      
      console.log(`🖼️ Спуфы применены к фрейму: ${frameUrl}`);
    } catch (error) {
      console.log(`⚠️ Ошибка применения спуфов к фрейму: ${error.message}`);
    }
  }

  /**
   * Создает новую страницу с подменами
   */
  async newPage() {
    const page = await this.context.newPage();
    await this.applySpoofs(page);
    console.log(`\n📄 Новая страница создана\n`);
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