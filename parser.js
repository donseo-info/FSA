import { BrowserController } from './controllers/BrowserController.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { ProxyManager } from './managers/ProxyManager.js';
import { TelegramNotifier } from './utils/TelegramNotifier.js';
import { DatabaseGate } from './utils/DatabaseGate.js';
import fs from 'fs';
import path from 'path';

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
    const browser = new BrowserController(profileName, { port, proxy });
    
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
// НАСТРОЙКИ ЛОГИРОВАНИЯ И TELEGRAM
// ========================================

// Создаем файл лога для этого запуска
const logTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFilename = `parser_log_${logTimestamp}.txt`;
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

// Создаем экземпляр TelegramNotifier
const telegramNotifier = new TelegramNotifier(writeLog);

// Создаем экземпляр DatabaseGate
const databaseGate = new DatabaseGate('http://pf.loc/parser-fsa/ids_gate_sql.php', writeLog);

// Обработка критических ошибок
process.on('uncaughtException', async (error) => {
  writeLog(`💥 Критическая ошибка: ${error.message}`, 'ERROR');
  writeLog(`📋 Стек: ${error.stack}`, 'ERROR');
  
  await telegramNotifier.sendCriticalErrorNotification(error);
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  writeLog(`💥 Необработанное отклонение промиса: ${reason}`, 'ERROR');
  
  await telegramNotifier.sendCriticalErrorNotification(new Error(`Unhandled rejection: ${reason}`));
  process.exit(1);
});

// ========================================
// ИСПОЛЬЗОВАНИЕ
// ========================================

const args = process.argv.slice(2);

if (args.length === 0) {
  writeLog('❌ Укажите имя профиля!', 'ERROR');
  writeLog('\nИспользование: node parser.js <профиль> [порт] [--proxy] [--days=N]', 'INFO');
  writeLog('\nПримеры:', 'INFO');
  writeLog('  node parser.js bot-123456789', 'INFO');
  writeLog('  node parser.js bot-123456789 --proxy', 'INFO');
  writeLog('  node parser.js bot-123456789 9223 --proxy', 'INFO');
  writeLog('  node parser.js bot-123456789 --days=30', 'INFO');
  writeLog('  node parser.js bot-123456789 --proxy --days=7', 'INFO');
  writeLog('\nПараметры:', 'INFO');
  writeLog('  --days=N    Количество дней вперед от сегодня (по умолчанию: 10)', 'INFO');
  process.exit(1);
}

const profileName = args[0];
const portArg = args.find(arg => !isNaN(parseInt(arg)));
const port = portArg ? parseInt(portArg) : 9222;
const useProxy = args.includes('--proxy');

// Извлекаем количество дней из аргументов
const daysArg = args.find(arg => arg.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1]) : 10;

// Запускаем браузер
writeLog(`🚀 Запуск парсера с профилем: ${profileName}`, 'INFO');
writeLog(`📋 Лог файл: ${logFilename}`, 'INFO');

// Вычисляем даты для фильтра (от сегодня до +N дней)
const today = new Date();
const dateNDaysLater = new Date(today);
dateNDaysLater.setDate(today.getDate() + days);

const filterDateFrom = today.toISOString().split('T')[0];
const filterDateTo = dateNDaysLater.toISOString().split('T')[0];

writeLog(`📅 Фильтр по дате окончания: от ${filterDateFrom} до ${filterDateTo} (сегодня +${days} дней)`, 'INFO');
writeLog(`🔍 Статусы: [14, 15, 3], Техрегламенты: [39, 8]`, 'INFO');

// Проверяем подключение к Telegram
await telegramNotifier.checkConnection();

// Проверяем доступность гейта базы данных
const gateAvailable = await databaseGate.checkGateHealth();
if (!gateAvailable) {
  writeLog('⚠️ Гейт базы данных недоступен, ID будут сохранены только в файл', 'WARN');
}

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

// Массив URL для блокировки
const blockedUrls = [
  'mc.yandex.ru',
  'www.gstatic.com',
  'yastatic.net',
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'facebook.com/tr',
  'vk.com/rtrg'
];

// Блокируем нежелательные запросы
await page.route('**/*', route => {
  const url = route.request().url();
  
  // Проверяем полные URL
  const isBlocked = blockedUrls.some(blockedUrl => url.includes(blockedUrl));
  
  // Блокируем шрифты .woff, .woff2, .ttf, .eot
  const isFont = /\.(woff|woff2|ttf|eot)(\?.*)?$/i.test(url);
  
  if (isBlocked || isFont) {
    console.log('🚫 Заблокирован запрос:', url);
    route.abort();
  } else {
    route.continue();
  }
});

writeLog('✅ Блокировка установлена для: ' + blockedUrls.join(', '), 'INFO');
writeLog('✅ Блокировка шрифтов (.woff, .woff2, .ttf, .eot) включена', 'INFO');


// Устанавливаем куки
await page.context().addCookies([
  {
    name: 'show_new_design',
    value: 'no',
    domain: 'pub.fsa.gov.ru',
    path: '/'
  },
  {
    name: 'show_old_design',
    value: 'always',
    domain: 'pub.fsa.gov.ru',
    path: '/'
  }
]);
writeLog('✅ Куки установлены', 'SUCCESS');

// Перехватываем заголовки ПЕРЕД загрузкой страницы
let capturedHeaders = null;
let requestIntercepted = false;

page.on('request', request => {
  const url = request.url();
  console.log(`📡 Запрос: ${url}`);
  
  // Перехватываем заголовки с ЛЮБОГО API запроса
  if ((url.includes('/api/v1/rds/common/declarations/get') || 
       url.includes('/nsi/api/')) && 
      !capturedHeaders) {
    capturedHeaders = request.headers();
    requestIntercepted = true;
    writeLog('✅ Заголовки перехвачены с: ' + url, 'SUCCESS');
    writeLog('📋 Заголовки: ' + JSON.stringify(capturedHeaders, null, 2), 'INFO');
  }
});

// Открываем страницу
writeLog('🌐 Открываем страницу...', 'INFO');
await page.goto('https://pub.fsa.gov.ru/rds/declaration', {
  waitUntil: 'domcontentloaded',
  timeout: 30000
});

writeLog('⏳ Ждем загрузки страницы...', 'INFO');
await page.waitForLoadState('networkidle');
writeLog('✅ Страница загружена', 'SUCCESS');

// Ждем пока страница сделает API запрос
writeLog('⏳ Ждем перехвата запроса...', 'INFO');
await page.waitForTimeout(5000);

if (!requestIntercepted) {
  writeLog('⚠️ Автоматический запрос не перехвачен. Пробуем взаимодействовать со страницей...', 'WARN');
  
  // Пробуем разные способы вызвать запрос
  try {
    await page.click('button').catch(() => {});
    await page.waitForTimeout(2000);
  } catch (e) {}
  
  try {
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(2000);
  } catch (e) {}
}

// Проверяем результат
if (!capturedHeaders) {
  writeLog('❌ ОШИБКА: Заголовки НЕ перехвачены!', 'ERROR');
  writeLog('🔍 Попробуйте вручную выполнить действие на странице, которое вызывает API запрос', 'WARN');
  writeLog('⏳ Ждем 30 секунд для ручного взаимодействия...', 'INFO');
  await page.waitForTimeout(30000);
  
  if (!capturedHeaders) {
    writeLog('❌ Заголовки так и не были перехвачены. Завершение.', 'ERROR');
    await browser.close();
    process.exit(1);
  }
}

writeLog('\n🚀 Начинаем обработку 10 страниц...', 'INFO');

// Массив для хранения всех ID
const allIds = [];
const apiContext = page.context().request;

// Проверяем доступность ресурса перед началом
writeLog('🔍 Проверяем доступность ресурса...', 'INFO');
try {
  const testResponse = await apiContext.get('https://pub.fsa.gov.ru/rds/declaration', {
    timeout: 30000
  });
  
  if (testResponse.ok()) {
    writeLog('✅ Ресурс доступен, продолжаем...', 'SUCCESS');
  } else {
    writeLog(`⚠️ Ресурс отвечает со статусом ${testResponse.status()}, но продолжаем...`, 'WARN');
  }
} catch (error) {
  writeLog(`⚠️ Ошибка проверки доступности: ${error.message}, но продолжаем...`, 'WARN');
}

// Настройки для повторных попыток
const MAX_RETRIES = 3;
const API_RETRY_DELAY = 60000; // 60 секунд для API ошибок
const NETWORK_RETRY_DELAY = 300000; // 5 минут для проблем с интернетом
const REQUEST_DELAY = 3000; // 3 секунды между запросами
const PAGE_RELOAD_DELAY = 10000; // 10 секунд при перезагрузке страницы
const MAX_IDLE_TIME = 30 * 60 * 1000; // 30 минут без данных

// Переменные для отслеживания времени
let lastSuccessfulDataTime = Date.now();
let startTime = Date.now();

// Функция для перехвата новых заголовков
async function recaptureHeaders() {
  writeLog('🔄 Перехватываем новые заголовки...', 'INFO');
  capturedHeaders = null;
  requestIntercepted = false;
  
  // Перезагружаем страницу
  await page.reload({ waitUntil: 'networkidle' });
  writeLog('✅ Страница перезагружена', 'SUCCESS');
  
  // Ждем перехвата запроса
  await page.waitForTimeout(5000);
  
  if (!requestIntercepted) {
    writeLog('⚠️ Автоматический запрос не перехвачен. Пробуем взаимодействовать...', 'WARN');
    try {
      await page.click('button').catch(() => {});
      await page.waitForTimeout(2000);
    } catch (e) {}
    
    try {
      await page.keyboard.press('Enter').catch(() => {});
      await page.waitForTimeout(2000);
    } catch (e) {}
  }
  
  if (!capturedHeaders) {
    writeLog('❌ Не удалось перехватить заголовки после перезагрузки', 'ERROR');
    return false;
  }
  
  writeLog('✅ Новые заголовки перехвачены', 'SUCCESS');
  return true;
}

// Функция для выполнения запроса с повторными попытками
async function makeRequestWithRetry(pageNum, retryCount = 0) {
  try {
    writeLog(`📄 Обрабатываем страницу ${pageNum + 1}/10 (попытка ${retryCount + 1}/${MAX_RETRIES})...`, 'INFO');
    
    // Используем даты, вычисленные в начале программы
    writeLog(`📅 Используем даты фильтра: от ${filterDateFrom} до ${filterDateTo}`, 'INFO');

const response = await apiContext.post('https://pub.fsa.gov.ru/api/v1/rds/common/declarations/get', {
  headers: capturedHeaders,
  data: {
        size: 100,
        page: pageNum,
    filter: {
      status: [14, 15, 3],
      idDeclType: [],
      idCertObjectType: [],
      idProductType: [],
      idGroupRU: [],
      idGroupEEU: [],
      idTechReg: [39, 8],
      idApplicantType: [],
      regDate: { minDate: null, maxDate: null },
      endDate: { minDate: filterDateFrom, maxDate: filterDateTo },
      columnsSearch: [],
      number: null,
      idProductOrigin: [],
      idProductEEU: [],
      idProductRU: [],
      idDeclScheme: [],
      awaitOperatorCheck: null,
      editApp: null,
      violationSendDate: null,
      isProtocolInvalid: null,
      checkerAIResult: null,
      checkerAIProtocolsResults: null,
      checkerAIProtocolsMistakes: null,
      hiddenFromOpen: null
    },
    columnsSort: [{ column: "declDate", sort: "DESC" }]
  }
});

    writeLog(`📊 Статус ответа страницы ${pageNum + 1}: ${response.status()}`, 'INFO');

if (response.ok()) {
  const data = await response.json();
      writeLog(`✅ Страница ${pageNum + 1} получена!`, 'SUCCESS');
      writeLog(`📦 Записей на странице: ${data.items ? data.items.length : 0}`, 'INFO');
      
      // Извлекаем ID из данных
      if (data.items && Array.isArray(data.items)) {
        const pageIds = data.items.map(item => item.id).filter(id => id !== undefined);
        allIds.push(...pageIds);
        lastSuccessfulDataTime = Date.now(); // Обновляем время последних данных
        writeLog(`🆔 ID добавлено с страницы ${pageNum + 1}: ${pageIds.length}`, 'SUCCESS');
        return { success: true, ids: pageIds };
      } else {
        writeLog(`⚠️ Нет данных items на странице ${pageNum + 1}`, 'WARN');
        return { success: true, ids: [] };
      }
    } else {
      const errorText = await response.text();
      writeLog(`❌ Ошибка запроса страницы ${pageNum + 1}!`, 'ERROR');
      writeLog(`Status: ${response.status()}`, 'ERROR');
      writeLog(`Response: ${errorText}`, 'ERROR');
      
      // Если сервер перегружен (503, 502, 429) - пробуем повторить
      if ([503, 502, 429, 504].includes(response.status())) {
        throw new Error(`Server overloaded: ${response.status()}`);
      }
      
      return { success: false, error: `HTTP ${response.status()}` };
    }
    
  } catch (error) {
    writeLog(`❌ Ошибка при обработке страницы ${pageNum + 1}: ${error.message}`, 'ERROR');
    
    // Определяем тип ошибки и выбираем соответствующую паузу
    const isNetworkError = error.message.includes('net::') || 
                          error.message.includes('timeout') ||
                          error.message.includes('ECONNRESET') ||
                          error.message.includes('ENOTFOUND');
    
    const isAPIError = error.message.includes('Server overloaded');
    
    if (isAPIError || isNetworkError) {
      if (retryCount < MAX_RETRIES - 1) {
        const delay = isAPIError ? API_RETRY_DELAY : NETWORK_RETRY_DELAY;
        const delayMinutes = Math.floor(delay / 60000);
        
        writeLog(`⏳ Пауза ${delayMinutes} минут перед повторной попыткой...`, 'WARN');
        await page.waitForTimeout(delay);
        
        // Если это первая неудачная попытка, пробуем перехватить новые заголовки
        if (retryCount === 0) {
          writeLog('🔄 Пробуем перехватить новые заголовки...', 'INFO');
          const headersRecaptured = await recaptureHeaders();
          if (!headersRecaptured) {
            writeLog('❌ Не удалось перехватить заголовки, пропускаем страницу', 'ERROR');
            return { success: false, error: 'Headers not recaptured' };
          }
          await page.waitForTimeout(PAGE_RELOAD_DELAY);
        }
        
        return await makeRequestWithRetry(pageNum, retryCount + 1);
      } else {
        writeLog(`❌ Превышено максимальное количество попыток для страницы ${pageNum + 1}`, 'ERROR');
        return { success: false, error: 'Max retries exceeded' };
      }
    }
    
    return { success: false, error: error.message };
  }
}

// Обрабатываем 10 страниц (от 0 до 9)
for (let pageNum = 0; pageNum < 10; pageNum++) {
  // Проверяем, не прошло ли 30 минут без данных
  const timeSinceLastData = Date.now() - lastSuccessfulDataTime;
  if (timeSinceLastData > MAX_IDLE_TIME) {
    writeLog('⏰ Прошло 30 минут без получения данных. Останавливаем парсер.', 'ERROR');
    
    const timeoutData = {
      totalIds: allIds.length,
      totalTime: Math.floor((Date.now() - startTime) / 60000),
      pagesProcessed: pageNum
    };
    
    await telegramNotifier.sendTimeoutNotification(timeoutData);
    break;
  }
  
  const result = await makeRequestWithRetry(pageNum);
  
  if (!result.success) {
    writeLog(`⚠️ Страница ${pageNum + 1} пропущена из-за ошибки: ${result.error}`, 'WARN');
  }
  
  // Увеличенная пауза между запросами
  if (pageNum < 9) { // Не ждем после последней страницы
    writeLog(`⏳ Пауза ${REQUEST_DELAY/1000} секунд перед следующим запросом...`, 'INFO');
    await page.waitForTimeout(REQUEST_DELAY);
  }
}

const endTime = Date.now();
const totalTime = Math.floor((endTime - startTime) / 60000);

writeLog(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`, 'INFO');
writeLog(`✅ Всего обработано страниц: 10`, 'INFO');
writeLog(`🆔 Всего ID собрано: ${allIds.length}`, 'INFO');
writeLog(`📈 Уникальных ID: ${new Set(allIds).size}`, 'INFO');
writeLog(`🔄 Дубликатов: ${allIds.length - new Set(allIds).size}`, 'INFO');
writeLog(`⏱️ Время выполнения: ${totalTime} минут`, 'INFO');
writeLog(`📅 Завершено: ${new Date().toLocaleString('ru-RU')}`, 'INFO');

// Сохраняем ID в файл
if (allIds.length > 0) {
  // Удаляем дубликаты, сохраняя порядок
  const uniqueIds = [...new Set(allIds)];
  const duplicatesCount = allIds.length - uniqueIds.length;
  
  if (duplicatesCount > 0) {
    writeLog(`🔄 Удалено дубликатов: ${duplicatesCount}`, 'INFO');
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ids_${timestamp}.txt`;
  
  const idsContent = uniqueIds.join('\n');
  fs.writeFileSync(filename, idsContent);
  
  writeLog(`💾 ID сохранены в файл: ${filename}`, 'SUCCESS');
  writeLog(`📊 Всего ID: ${allIds.length}, уникальных: ${uniqueIds.length}`, 'INFO');
  writeLog(`📄 Первые 10 ID: ${uniqueIds.slice(0, 10).join(', ')}`, 'INFO');
  writeLog(`📄 Последние 10 ID: ${uniqueIds.slice(-10).join(', ')}`, 'INFO');
  
  // Отправляем ID в базу данных
  let dbResult = null;
  if (gateAvailable) {
    writeLog('📤 Отправляем ID в базу данных...', 'INFO');
    dbResult = await databaseGate.sendIdsInBatches(uniqueIds, 'parser');
    
    if (dbResult.success) {
      writeLog(`✅ ID успешно отправлены в базу данных`, 'SUCCESS');
      writeLog(`📊 БД статистика: Добавлено: ${dbResult.data.totalAdded}, Пропущено: ${dbResult.data.totalSkipped}, Ошибок: ${dbResult.data.totalErrors}`, 'INFO');
    } else {
      writeLog(`❌ Ошибка отправки ID в базу данных`, 'ERROR');
    }
  }
  
  // Отправляем уведомление об успешном завершении
  const successData = {
    totalIds: allIds.length,
    uniqueIds: uniqueIds.length,
    totalTime: totalTime,
    pagesProcessed: 10,
    filename: filename,
    logFilename: logFilename,
    dbAdded: dbResult?.data?.totalAdded || 0,
    dbSkipped: dbResult?.data?.totalSkipped || 0
  };
  
  await telegramNotifier.sendSuccessNotification(successData);
} else {
  writeLog('⚠️ ID не найдены для сохранения', 'WARN');
  
  // Отправляем уведомление о неудачном завершении
  const failureData = {
    totalIds: 0,
    totalTime: totalTime,
    pagesProcessed: 10,
    logFilename: logFilename
  };
  
  await telegramNotifier.sendFailureNotification(failureData);
}

// Держим браузер открытым
writeLog('\n⏳ Браузер будет открыт 60 секунд...', 'INFO');
writeLog('(Нажмите Ctrl+C для завершения)', 'INFO');

await new Promise(resolve => setTimeout(resolve, 60000));

// Закрываем браузер
await browser.close();
writeLog('\n✅ Завершено', 'SUCCESS');