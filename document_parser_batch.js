import { BrowserController } from './controllers/BrowserController.js';
import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { ProxyManager } from './managers/ProxyManager.js';
import { DocumentsGate } from './utils/DocumentsGate.js';
import fs from 'fs';

/**
 * Парсер документов по ID (массовый)
 * Второй этап - детальный парсинг данных по конкретным документам
 * Принимает массив ID и обрабатывает их в одном браузере
 */

// Создаем имя лог-файла один раз для всей сессии
const logFilename = `logs/document_parser_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}Z.log`;

// Функция для записи логов
function writeLog(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  
  // Записываем в один файл для всей сессии
  fs.appendFileSync(logFilename, logMessage + '\n');
}

// Настройки
const MAX_RETRIES = 3;
const REQUEST_DELAY = 2000; // 2 секунды между запросами
const API_RETRY_DELAY = 60000; // 60 секунд для API ошибок
const NETWORK_RETRY_DELAY = 300000; // 5 минут для проблем с интернетом
const PAGE_RELOAD_DELAY = 10000; // 10 секунд при перезагрузке страницы

// Константы для работы парсера

// Создаем экземпляр DocumentsGate
const documentsGate = new DocumentsGate('http://super.of-crimea.ru/parser-fsa/documents_gate_simple.php', writeLog);

// Обработка критических ошибок
process.on('uncaughtException', async (error) => {
  writeLog(`💥 Критическая ошибка: ${error.message}`, 'ERROR');
  writeLog(`📋 Стек: ${error.stack}`, 'ERROR');
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  writeLog(`💥 Необработанное отклонение: ${reason}`, 'ERROR');
  process.exit(1);
});

/**
 * Запускает браузер с профилем (копия из parser.js)
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
    
    // Создаем контроллер браузера
    const browserController = new BrowserController(profileName, { port, proxy });
    
    // Запускаем браузер
    await browserController.launch();
    await browserController.connect();
    
    console.log('✅ Браузер готов к работе!\n');
    
    return { browser: browserController, browserController, proxyIP };
  } catch (error) {
    console.error(`❌ Ошибка запуска браузера: ${error.message}`);
    throw error;
  }
}

// Функция для перехвата заголовков (копия из parser.js)
async function captureHeaders(page) {
  const headers = {};
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('pub.fsa.gov.ru/api/v1/rds/common/declarations')) {
      const requestHeaders = request.headers();
      Object.assign(headers, requestHeaders);
      writeLog(`🔍 Перехвачены заголовки для ${url}`, 'INFO');
    }
  });
  
  return headers;
}

// Функция для парсинга документа по ID
async function parseDocumentById(page, documentId, capturedHeaders) {
  try {
    writeLog(`📄 Парсим документ ID: ${documentId}`, 'INFO');
    
    // Используем тот же подход, что и в parser.js
    const apiContext = page.context().request;
    
    const response = await apiContext.get(`https://pub.fsa.gov.ru/api/v1/rds/common/declarations/${documentId}`, {
      headers: capturedHeaders
    });
    
    writeLog(`📊 Статус ответа для документа ${documentId}: ${response.status()}`, 'INFO');
    
    if (response.ok()) {
      const data = await response.json();
      writeLog(`✅ Документ ${documentId} получен!`, 'SUCCESS');
      
      // Полный ответ API получен (не выводим в лог из-за размера)
      
      // Извлекаем нужные данные
      const documentData = extractDocumentData(data, documentId);
      
      if (documentData) {
        writeLog(`📋 Документ ${documentId}: ${documentData.number || 'без номера'} | ${documentData.applicant?.fullName || 'без заявителя'} | ${documentData.applicant?.email || 'без email'}`, 'INFO');
        
        return documentData;
      } else {
        writeLog(`⚠️ Не удалось извлечь данные из документа ${documentId}`, 'WARN');
        return null;
      }
    } else {
      writeLog(`❌ Ошибка получения документа ${documentId}: ${response.status()}`, 'ERROR');
      return null;
    }
    
  } catch (error) {
    writeLog(`❌ Ошибка парсинга документа ${documentId}: ${error.message}`, 'ERROR');
    return null;
  }
}

// Функция для извлечения данных из ответа API
function extractDocumentData(data, documentId) {
  try {
    const result = {
      // Основные данные документа (новая структура)
      documents: {
        idDeclaration: data.idDeclaration,
        number: data.number,
        declRegDate: data.declRegDate,
        declEndDate: data.declEndDate,
        idStatus: data.idStatus,
        idDeclScheme: data.idDeclScheme,
        idDeclType: data.idDeclType,
        idObjectDeclType: data.idObjectDeclType,
        submissionDate: data.submissionDate,
        lastUpdate: data.lastUpdate,
        firstName: data.firstName,
        surname: data.surname,
        patronymic: data.patronymic
      },
      
      // Данные заявителя
      applicant: null,
      
      // Данные изготовителя
      manufacturer: null,
      
      // Данные продукции
      product: null,
      
      // Лаборатории
      testingLabs: [],
      
      // Контакты
      contacts: [],
      
      // Адреса
      addresses: []
    };
    
    // Извлекаем данные заявителя
    if (data.applicant) {
      result.applicant = {
        idLegalSubject: data.applicant.idLegalSubject,
        idPerson: data.applicant.idPerson,
        fullName: data.applicant.fullName,
        shortName: data.applicant.shortName,
        surname: data.applicant.surname,
        firstName: data.applicant.firstName,
        patronymic: data.applicant.patronymic,
        headPosition: data.applicant.headPosition,
        ogrn: data.applicant.ogrn,
        inn: data.applicant.inn,
        kpp: data.applicant.kpp,
        regDate: data.applicant.regDate,
        regOrganName: data.applicant.regOrganName,
        email: data.applicant.contacts?.find(c => c.idContactType === 4)?.value || null,
        phone: data.applicant.contacts?.find(c => c.idContactType === 1)?.value || null
      };
      
      // Извлекаем контакты заявителя
      if (data.applicant.contacts && Array.isArray(data.applicant.contacts)) {
        result.contacts = data.applicant.contacts.map(contact => ({
          idContact: contact.idContact,
          idContactType: contact.idContactType,
          value: contact.value
        }));
      }
      
      // Извлекаем адреса заявителя
      if (data.applicant.addresses && Array.isArray(data.applicant.addresses)) {
        result.addresses = data.applicant.addresses;
      }
    }
    
    // Извлекаем данные изготовителя
    if (data.manufacturer) {
      result.manufacturer = {
        idLegalSubject: data.manufacturer.idLegalSubject,
        fullName: data.manufacturer.fullName,
        shortName: data.manufacturer.shortName,
        surname: data.manufacturer.surname,
        firstName: data.manufacturer.firstName,
        patronymic: data.manufacturer.patronymic,
        ogrn: data.manufacturer.ogrn,
        inn: data.manufacturer.inn,
        kpp: data.manufacturer.kpp,
        regDate: data.manufacturer.regDate,
        regOrganName: data.manufacturer.regOrganName,
        addresses: data.manufacturer.addresses || []
      };
    }
    
    // Извлекаем данные о продукции
    if (data.product) {
      result.product = {
        idProduct: data.product.idProduct,
        fullName: data.product.fullName,
        marking: data.product.marking,
        usageScope: data.product.usageScope,
        storageCondition: data.product.storageCondition,
        usageCondition: data.product.usageCondition,
        identifications: data.product.identifications || []
      };
    }
    
    // Извлекаем данные испытательных лабораторий
    if (data.testingLabs && Array.isArray(data.testingLabs)) {
      data.testingLabs.forEach(lab => {
        result.testingLabs.push({
          idTestingLab: lab.idTestingLab,
          regNumber: lab.regNumber,
          fullName: lab.fullName,
          beginDate: lab.beginDate,
          endDate: lab.endDate,
          protocols: lab.protocols || []
        });
      });
    }
    
    return result;
    
  } catch (error) {
    writeLog(`❌ Ошибка извлечения данных: ${error.message}`, 'ERROR');
    return null;
  }
}

// Функция для выполнения запроса с повторными попытками
async function makeRequestWithRetry(page, documentId, capturedHeaders, retryCount = 0) {
  try {
    if (retryCount > 0) {
      writeLog(`🔄 Повторная попытка ${retryCount + 1}/${MAX_RETRIES} для документа ${documentId}...`, 'INFO');
    }
    
    const result = await parseDocumentById(page, documentId, capturedHeaders);
    
    if (result) {
      return { success: true, data: result };
    } else {
      throw new Error(`Не удалось получить данные документа ${documentId}`);
    }
    
  } catch (error) {
    writeLog(`❌ Ошибка при обработке документа ${documentId}: ${error.message}`, 'ERROR');
    
    if (retryCount < MAX_RETRIES - 1) {
      const delay = error.message.includes('network') || error.message.includes('timeout') 
        ? NETWORK_RETRY_DELAY 
        : API_RETRY_DELAY;
      
      writeLog(`⏳ Повторная попытка ${retryCount + 2}/${MAX_RETRIES} через ${delay/1000} секунд...`, 'INFO');
      await page.waitForTimeout(delay);
      
      // Повторяем запрос с теми же заголовками
      return await makeRequestWithRetry(page, documentId, capturedHeaders, retryCount + 1);
    } else {
      writeLog(`💥 Максимальное количество попыток исчерпано для документа ${documentId}`, 'ERROR');
      return { success: false, error: error.message };
    }
  }
}

// Основная функция
async function main() {
  // Проверяем доступность гейта документов
  let gateAvailable = false;
  try {
    gateAvailable = await documentsGate.checkGateHealth();
    if (!gateAvailable) {
      writeLog('⚠️ Гейт документов недоступен, данные будут сохранены только в файл', 'WARN');
    } else {
      writeLog('✅ Гейт документов доступен', 'SUCCESS');
    }
  } catch (error) {
    writeLog(`❌ Ошибка проверки гейта: ${error.message}`, 'ERROR');
  }
  
  const { browser, browserController, proxyIP } = await startBrowser(profileName, port, useProxy);
  
  try {
    // Получаем существующие страницы (как в parser.js)
    const pages = browserController.context.pages();
    
    let page;
    
    if (pages.length > 0) {
      page = pages[0];
      writeLog('📄 Используем существующую вкладку', 'INFO');
    } else {
      page = await browserController.newPage();
      writeLog('📄 Создана новая вкладка', 'INFO');
    }
    
    // Блокируем ненужные ресурсы (копия из parser.js)
    const blockedUrls = [
      'mc.yandex.ru', 'www.gstatic.com', 'yastatic.net', 'google-analytics.com',
      'googletagmanager.com', 'doubleclick.net', 'facebook.com/tr', 'vk.com/rtrg'
    ];
    
    await page.route('**/*', route => {
      const url = route.request().url();
      const isBlocked = blockedUrls.some(blockedUrl => url.includes(blockedUrl));
      const isFont = /\.(woff|woff2|ttf|eot)(\?.*)?$/i.test(url);
      if (isBlocked || isFont) {
        writeLog('🚫 Заблокирован запрос: ' + url, 'INFO');
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Перехватываем заголовки с API запроса (устанавливаем ДО перехода на страницу)
    let capturedHeaders = null;
    let requestIntercepted = false;
    
    page.on('request', request => {
      const url = request.url();
      
      // Перехватываем заголовки с ЛЮБОГО API запроса (как в parser.js)
      if ((url.includes('/api/v1/rds/common/declarations/get') || 
           url.includes('/nsi/api/')) && 
          !capturedHeaders) {
        capturedHeaders = request.headers();
        requestIntercepted = true;
        writeLog('✅ Заголовки перехвачены с API', 'SUCCESS');
      }
    });
    
    // Переходим на страницу для перехвата заголовков
    writeLog('🌐 Переходим на страницу для перехвата заголовков...', 'INFO');
    await page.goto('https://pub.fsa.gov.ru/rds/declaration', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    writeLog('⏳ Ждем загрузки страницы...', 'INFO');
    await page.waitForTimeout(3000);
    
    // Устанавливаем куки (как в parser.js)
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
    
    // Ждем загрузки страницы и перехвата заголовков (точно как в parser.js)
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
      throw new Error('Не удалось перехватить заголовки для API запросов');
    }
    
    writeLog('✅ Заголовки готовы', 'SUCCESS');
    
    // Обрабатываем все документы в цикле
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < documentIds.length; i++) {
      const documentId = documentIds[i];
      writeLog(`\n📄 Обрабатываем документ ${i + 1}/${documentIds.length}: ID ${documentId}`, 'INFO');
      
      try {
        const result = await makeRequestWithRetry(page, documentId, capturedHeaders);
        
        if (result.success) {
          writeLog(`✅ Документ ${documentId} успешно распарсен!`, 'SUCCESS');
          
          // Сохраняем данные в файл
          const filename = `logs/document_${documentId}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}Z.json`;
          fs.writeFileSync(filename, JSON.stringify(result.data, null, 2));
          writeLog(`💾 Данные сохранены в файл: ${filename}`, 'SUCCESS');
          
          // Отправляем данные в базу, если гейт доступен
          if (gateAvailable) {
            const saveResult = await documentsGate.saveDocument(result.data);
            if (saveResult.success) {
              writeLog(`✅ Данные документа ${documentId} сохранены в базу данных`, 'SUCCESS');
            } else {
              writeLog(`❌ Ошибка сохранения в базу: ${saveResult.error}`, 'ERROR');
            }
          }
          
          successCount++;
        } else {
          writeLog(`❌ Ошибка парсинга документа ${documentId}`, 'ERROR');
          errorCount++;
        }
        
        // Задержка между документами
        if (i < documentIds.length - 1) {
          writeLog(`⏳ Задержка ${REQUEST_DELAY/1000}с перед следующим документом...`, 'INFO');
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
        }
        
      } catch (error) {
        writeLog(`❌ Критическая ошибка при обработке документа ${documentId}: ${error.message}`, 'ERROR');
        errorCount++;
      }
    }
    
    writeLog(`\n📊 Итоги обработки:`, 'INFO');
    writeLog(`✅ Успешно: ${successCount}`, 'SUCCESS');
    writeLog(`❌ Ошибок: ${errorCount}`, errorCount > 0 ? 'ERROR' : 'INFO');
    writeLog(`📄 Всего: ${documentIds.length}`, 'INFO');
    
    // Контекст остается открытым (как в parser.js)
    
  } catch (error) {
    writeLog(`💥 Критическая ошибка: ${error.message}`, 'ERROR');
  } finally {
    await browserController.close();
    writeLog('\n✅ Завершено', 'SUCCESS');
  }
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Использование: node document_parser_new.js <profileName> <documentIds> [port] [--proxy]');
  console.log('Пример: node document_parser_new.js bot-111806668 "20320547,20320548,20320549" 9222 --proxy');
  console.log('Пример: node document_parser_new.js bot-111806668 20320547 9222 --proxy');
  process.exit(1);
}

const profileName = args[0];
const documentIdsInput = args[1];
const port = args[2] ? parseInt(args[2]) : 9222;
const useProxy = args.includes('--proxy');

// Парсим ID документов
let documentIds = [];
if (documentIdsInput.includes(',')) {
  // Если переданы через запятую
  documentIds = documentIdsInput.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
} else {
  // Если передан один ID
  const singleId = parseInt(documentIdsInput);
  if (!isNaN(singleId)) {
    documentIds = [singleId];
  }
}

if (documentIds.length === 0) {
  console.log('❌ Ошибка: Не удалось распарсить ID документов');
  process.exit(1);
}

writeLog(`🚀 Запуск массового парсера документов`, 'INFO');
writeLog(`📋 Профиль: ${profileName}`, 'INFO');
writeLog(`📄 ID документов: ${documentIds.join(', ')} (${documentIds.length} шт.)`, 'INFO');
writeLog(`🔌 Порт: ${port}`, 'INFO');
writeLog(`🌐 Прокси: ${useProxy ? 'включен' : 'отключен'}`, 'INFO');

// Запускаем основную функцию
main().catch(error => {
  writeLog(`💥 Фатальная ошибка: ${error.message}`, 'ERROR');
  process.exit(1);
});
