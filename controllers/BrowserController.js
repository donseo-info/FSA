import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { ScreenSpoof, LanguageSpoof, HardwareSpoof, WebRTCSpoof, WebGLSpoof, CanvasSpoof, AudioSpoof } from '../spoofs/index.js';
import { ProfileGenerator } from '../managers/ProfileGenerator.js';

/**
 * Главный контроллер браузера
 */
class BrowserController {
  constructor(profileName, options = {}) {
    this.profileName = profileName;
    this.port = options.port || 9222;
    this.proxy = options.proxy || null;
    
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
      })
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

    // Создаем и загружаем WebRTC расширение
    if (this.spoofs.webrtc) {
      const extensionPath = this.spoofs.webrtc.createExtension();
      if (extensionPath) {
        chromeArgs.push(`--load-extension=${extensionPath}`);
      }
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
      await this.applySpoofs(page);
    });
    
    console.log('✅ Подключение установлено\n');
    
    return { browser: this.browser, context: this.context };
  }

  /**
   * Применяет все спуфы к странице
   */
  async applySpoofs(page) {
    await this.spoofs.screen.apply(page);
    await this.spoofs.language.apply(page);
    await this.spoofs.hardware.apply(page);
    await this.spoofs.webgl.apply(page);
    await this.spoofs.canvas.apply(page);
    await this.spoofs.audio.apply(page);
    
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
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