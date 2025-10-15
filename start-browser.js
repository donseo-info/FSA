import { BrowserController } from './controllers/BrowserController.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { ProxyManager } from './managers/ProxyManager.js';

/**
 * Запускает браузер с профилем
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
    if (useProxy) {
      const proxyManager = new ProxyManager('./proxies.txt', {
        checkUrl: 'https://api.ipify.org?format=json',  // URL для проверки
        checkTimeout: 10000,  // 10 секунд таймаут
        retryDelay: 5000,     // 5 секунд между попытками
        maxRetries: 3         // 3 попытки на прокси
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
      
      // Выводим IP прокси
      const proxyIP = proxyManager.getIP();
      console.log(`✅ Будет использован прокси с IP: ${proxyIP}\n`);
    }
    
    // Создаем контроллер
    const browser = new BrowserController(profileName, { port, proxy });
    
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
// ИСПОЛЬЗОВАНИЕ
// ========================================

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Укажите имя профиля!');
  console.log('\nИспользование: node start-browser.js <профиль> [порт] [--proxy]');
  console.log('\nПримеры:');
  console.log('  node start-browser.js bot-123456789');
  console.log('  node start-browser.js bot-123456789 --proxy');
  console.log('  node start-browser.js bot-123456789 9223 --proxy');
  process.exit(1);
}

const profileName = args[0];
const portArg = args.find(arg => !isNaN(parseInt(arg)));
const port = portArg ? parseInt(portArg) : 9222;
const useProxy = args.includes('--proxy');

// Запускаем браузер
const { browser } = await startBrowser(profileName, port, useProxy);

// ========================================
// ВАША ЛОГИКА БОТА ЗДЕСЬ
// ========================================

// Получаем существующие страницы
const pages = browser.context.pages();

let page;

if (pages.length > 0) {
  page = pages[0];
  console.log('📄 Используем существующую вкладку');
} else {
  page = await browser.newPage();
  console.log('📄 Создана новая вкладка');
}

// Применяем спуфы к странице
await browser.applySpoofs(page);

// Переходим на сайт
await page.goto('https://vk.com', { 
  waitUntil: 'domcontentloaded',
  timeout: 30000 
});

console.log('✅ Страница загружена!');
console.log('📄 Заголовок:', await page.title());

// Держим браузер открытым
console.log('\n⏳ Браузер будет открыт 60 секунд...');
console.log('(Нажмите Ctrl+C для завершения)\n');

await new Promise(resolve => setTimeout(resolve, 60000));

// Закрываем браузер
//await browser.close();
console.log('\n✅ Завершено\n');