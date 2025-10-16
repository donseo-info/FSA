import { BrowserController } from './controllers/BrowserController.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { ProxyManager } from './managers/ProxyManager.js';
import fs from 'fs';
import path from 'path';

/**
 * Запускает браузер с профилем для серфинга
 */
async function startBrowser(profileName, port = 9222, useProxy = false) {
  try {
    const generator = new ProfileGenerator();
    
    if (!generator.profileExists(profileName)) {
      console.error(`❌ Профиль "${profileName}" не найден!`);
      process.exit(1);
    }
    
    // Получаем прокси если нужно
    let proxy = null;
    let proxyIP = null;
    
    if (useProxy) {
      const proxyManager = new ProxyManager('./proxies.txt', {
        checkUrl: 'https://api.ipify.org?format=json',
        checkTimeout: 10000,
        retryDelay: 5000,
        maxRetries: 3
      });
      
      if (proxyManager.getCount() === 0) {
        console.error('❌ Прокси не найдены в proxies.txt');
        process.exit(1);
      }
      
      // ВАЖНО: Проверяем прокси ПЕРЕД запуском браузера
      proxy = await proxyManager.getCheckedProxy();
      
      if (!proxy) {
        console.error('❌ Не найдено рабочих прокси!');
        process.exit(1);
      }
      
      // Получаем IP прокси
      proxyIP = proxyManager.getIP();
      console.log(`✅ Используется прокси с IP: ${proxyIP}\n`);
    }
    
    // Создаем контроллер с прокси
    const browser = new BrowserController(profileName, { port, proxy, enablePlugins: false });
    
    // Если есть WebRTC spoof и IP прокси, устанавливаем IP
    if (browser.spoofs.webrtc && proxyIP) {
      browser.spoofs.webrtc.setIP(proxyIP);
      console.log(`🔒 WebRTC: Будет использован IP ${proxyIP}\n`);
    }
    
    await browser.launch();
    await browser.connect();
    
    console.log('✅ Браузер готов к работе!\n');
    
    return { browser };
    
  } catch (error) {
    console.error('\n❌ Ошибка запуска:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ========================================
// НАСТРОЙКИ ЛОГИРОВАНИЯ
// ========================================

// Создаем файл лога для этого запуска
const logTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFilename = `serfer_log_${logTimestamp}.txt`;
const logPath = path.join(process.cwd(), 'logs', logFilename);

// Создаем папку logs если её нет
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}

// Функция для записи в лог
function writeLog(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;
  
  // Выводим в консоль
  console.log(message);
  
  // Записываем в файл
  fs.appendFileSync(logPath, logMessage);
}

// ========================================
// ИСПОЛЬЗОВАНИЕ
// ========================================

const args = process.argv.slice(2);

if (args.length === 0) {
  writeLog('❌ Укажите имя профиля!', 'ERROR');
  writeLog('\nИспользование: node serfer.js <профиль> [порт] [--proxy]', 'INFO');
  writeLog('\nПримеры:', 'INFO');
  writeLog('  node serfer.js bot-123456789', 'INFO');
  writeLog('  node serfer.js bot-123456789 --proxy', 'INFO');
  writeLog('  node serfer.js bot-123456789 9223 --proxy', 'INFO');
  process.exit(1);
}

const profileName = args[0];
const portArg = args.find(arg => !isNaN(parseInt(arg)));
const port = portArg ? parseInt(portArg) : 9222;
const useProxy = args.includes('--proxy');

// Запускаем браузер
writeLog(`🚀 Запуск серфера с профилем: ${profileName}`, 'INFO');
writeLog(`📋 Лог файл: ${logFilename}`, 'INFO');
writeLog(`🔧 Порт: ${port}, Прокси: ${useProxy ? 'включен' : 'выключен'}`, 'INFO');

const { browser } = await startBrowser(profileName, port, useProxy);

// ========================================
// ОСНОВНАЯ ЛОГИКА СЕРФЕРА
// ========================================

// Получаем существующие страницы
const pages = browser.context.pages();

let page;

if (pages.length > 0) {
  page = pages[0];
  writeLog('📄 Используем существующую вкладку', 'INFO');
  // Применяем спуфы к существующей странице
  await browser.applySpoofs(page);
} else {
  page = await browser.newPage();
  writeLog('📄 Создана новая вкладка', 'INFO');
  // Спуфы применяются автоматически через событие 'page' в BrowserController
  // Даем время спуфам примениться
  await page.waitForTimeout(500);
}

// Переходим на тестовую страницу
writeLog('🌐 Переходим на тестовую страницу...', 'INFO');
await page.goto('https://vk.com', { 
  waitUntil: 'domcontentloaded',
  timeout: 30000 
});

writeLog('✅ Страница загружена!', 'SUCCESS');

// Получаем заголовок с обработкой ошибок
try {
  const title = await page.title();
  writeLog(`📄 Заголовок: ${title}`, 'INFO');
} catch (error) {
  writeLog(`⚠️ Не удалось получить заголовок: ${error.message}`, 'WARN');
}

// Проверяем, что спуфы применились
try {
  // Проверяем GPU
  const gpuInfo = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          };
        }
      }
      return null;
    } catch (e) {
      return { error: e.message };
    }
  });
  
  if (gpuInfo && !gpuInfo.error) {
    writeLog(`🎮 GPU Vendor: ${gpuInfo.vendor}`, 'INFO');
    writeLog(`🎮 GPU Renderer: ${gpuInfo.renderer}`, 'INFO');
  } else if (gpuInfo && gpuInfo.error) {
    writeLog(`⚠️ Ошибка получения GPU: ${gpuInfo.error}`, 'WARN');
  }
  
  // Проверяем User Agent
  const userAgent = await page.evaluate(() => {
    try {
      return navigator.userAgent;
    } catch (e) {
      return `Error: ${e.message}`;
    }
  });
  writeLog(`🌐 User Agent: ${userAgent.substring(0, 100)}...`, 'INFO');
  
} catch (error) {
  writeLog(`⚠️ Ошибка проверки спуфов: ${error.message}`, 'WARN');
}

// Держим браузер открытым
writeLog('\n⏳ Браузер будет открыт 60 секунд...', 'INFO');
writeLog('(Нажмите Ctrl+C для завершения)\n', 'INFO');

await new Promise(resolve => setTimeout(resolve, 60000));

// Закрываем браузер
//await browser.close();
writeLog('\n✅ Завершено\n', 'SUCCESS');
