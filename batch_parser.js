import { spawn } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';

/**
 * Пакетный парсер документов
 * Получает ID из API, парсит их по очереди, отмечает как обработанные
 */

const API_BASE_URL = 'http://pf.loc/parser-fsa/api.php';
const BATCH_SIZE = 10;
const TIMEOUT_BETWEEN_BATCHES = 100000; // 1 минута
const PROFILE_NAME = 'bot-111806668';
const USE_PROXY = true;

// Создаем имя лог-файла один раз для всей сессии
const logFile = `logs/batch_parser_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}Z.log`;

// Функция для логирования
function writeLog(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // Записываем в один файл для всей сессии
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Функция для получения свободных ID из API
async function getFreeIds(count = BATCH_SIZE) {
  try {
    writeLog(`📥 Получаем ${count} свободных ID из API...`);
    
    const response = await fetch(`${API_BASE_URL}?action=get&count=${count}`);
    const data = await response.json();
    
    if (data.success) {
      writeLog(`✅ Получено ${data.data.ids.length} ID: ${data.data.ids.join(', ')}`);
      return data.data.ids;
    } else {
      writeLog(`❌ Ошибка получения ID: ${data.message}`, 'ERROR');
      return [];
    }
  } catch (error) {
    writeLog(`❌ Ошибка API запроса: ${error.message}`, 'ERROR');
    return [];
  }
}

// Функция для отметки ID как обработанного
async function markIdAsUsed(id) {
  try {
    writeLog(`✅ Отмечаем ID ${id} как обработанный...`);
    
    const response = await fetch(`${API_BASE_URL}?action=ok&id=${id}`);
    const data = await response.json();
    
    if (data.success) {
      writeLog(`✅ ID ${id} отмечен как обработанный`);
      return true;
    } else {
      writeLog(`❌ Ошибка отметки ID ${id}: ${data.message}`, 'ERROR');
      return false;
    }
  } catch (error) {
    writeLog(`❌ Ошибка API запроса для ID ${id}: ${error.message}`, 'ERROR');
    return false;
  }
}

// Функция для запуска массового парсера документов
function parseDocuments(documentIds) {
  return new Promise((resolve, reject) => {
    writeLog(`🧪 Запускаем массовый парсинг документов ID: ${documentIds.join(', ')}`);
    
    const args = [documentIds.join(',')];
    if (USE_PROXY) {
      args.push('--proxy');
    }
    
    const child = spawn('node', ['document_parser_batch.js', PROFILE_NAME, ...args], {
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        writeLog(`✅ Документы ${documentIds.join(', ')} успешно обработаны`);
        resolve({ success: true, output });
      } else {
        writeLog(`❌ Ошибка обработки документов ${documentIds.join(', ')} (код: ${code})`, 'ERROR');
        if (errorOutput) {
          writeLog(`Детали ошибки: ${errorOutput}`, 'ERROR');
        }
        resolve({ success: false, error: errorOutput, code });
      }
    });
    
    child.on('error', (error) => {
      writeLog(`❌ Ошибка запуска парсера для документов ${documentIds.join(', ')}: ${error.message}`, 'ERROR');
      reject(error);
    });
  });
}

// Функция для обработки одной партии ID
async function processBatch(ids) {
  writeLog(`🔄 Начинаем обработку партии из ${ids.length} документов`);
  
  try {
    // Парсим все документы одним запуском
    const result = await parseDocuments(ids);
    
    if (result.success) {
      writeLog(`✅ Все документы партии успешно обработаны`);
      
      // Отмечаем все ID как обработанные
      let successCount = 0;
      let errorCount = 0;
      
      for (const documentId of ids) {
        const marked = await markIdAsUsed(documentId);
        if (marked) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      writeLog(`📊 Партия завершена: ${successCount} успешно, ${errorCount} с ошибками`);
      return { successCount, errorCount };
    } else {
      writeLog(`❌ Ошибка парсинга партии документов`, 'ERROR');
      return { successCount: 0, errorCount: ids.length };
    }
  } catch (error) {
    writeLog(`❌ Критическая ошибка при обработке партии: ${error.message}`, 'ERROR');
    return { successCount: 0, errorCount: ids.length };
  }
}

// Функция для получения статистики
async function getStats() {
  try {
    const response = await fetch(`${API_BASE_URL}?action=stats`);
    const data = await response.json();
    
    if (data.success) {
      const stats = data.data;
      writeLog(`📊 Статистика: Всего ${stats.total}, Доступно ${stats.available}, Использовано ${stats.used} (${stats.usage_percentage}%)`);
      return stats;
    }
  } catch (error) {
    writeLog(`❌ Ошибка получения статистики: ${error.message}`, 'ERROR');
  }
  return null;
}

// Основная функция
async function main() {
  writeLog('🚀 Запуск пакетного парсера документов');
  writeLog(`⚙️ Настройки: Партия ${BATCH_SIZE} документов, Профиль ${PROFILE_NAME}, Прокси ${USE_PROXY ? 'включен' : 'выключен'}`);
  
  // Получаем начальную статистику
  await getStats();
  
  let batchNumber = 1;
  
  while (true) {
    try {
      writeLog(`\n🔄 === ПАРТИЯ ${batchNumber} ===`);
      
      // Получаем свободные ID
      const ids = await getFreeIds(BATCH_SIZE);
      
      if (ids.length === 0) {
        writeLog('⚠️ Свободных ID не найдено, ждем 5 минут...', 'WARN');
        await new Promise(resolve => setTimeout(resolve, 300000)); // 5 минут
        continue;
      }
      
      // Обрабатываем партию
      const result = await processBatch(ids);
      
      // Обновляем статистику
      await getStats();
      
      // Пауза между партиями
      if (result.successCount > 0 || result.errorCount > 0) {
        writeLog(`⏳ Пауза ${TIMEOUT_BETWEEN_BATCHES / 1000} секунд перед следующей партией...`);
        await new Promise(resolve => setTimeout(resolve, TIMEOUT_BETWEEN_BATCHES));
      }
      
      batchNumber++;
      
    } catch (error) {
      writeLog(`💥 Критическая ошибка в партии ${batchNumber}: ${error.message}`, 'ERROR');
      writeLog('⏳ Пауза 2 минуты перед повторной попыткой...', 'WARN');
      await new Promise(resolve => setTimeout(resolve, 120000)); // 2 минуты
    }
  }
}

// Обработка сигналов завершения
process.on('SIGINT', () => {
  writeLog('\n🛑 Получен сигнал завершения, останавливаем парсер...', 'WARN');
  process.exit(0);
});

process.on('SIGTERM', () => {
  writeLog('\n🛑 Получен сигнал завершения, останавливаем парсер...', 'WARN');
  process.exit(0);
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  writeLog(`💥 Необработанная ошибка: ${error.message}`, 'ERROR');
  writeLog(`Стек: ${error.stack}`, 'ERROR');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  writeLog(`💥 Необработанное отклонение промиса: ${reason}`, 'ERROR');
  process.exit(1);
});

// Запускаем основную функцию
main().catch(error => {
  writeLog(`💥 Фатальная ошибка: ${error.message}`, 'ERROR');
  process.exit(1);
});
