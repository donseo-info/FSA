import { telegramConfig } from './telegram-config.js';

/**
 * Класс для отправки ID в базу данных через PHP гейт
 */
export class DatabaseGate {
  constructor(gateUrl, logger = null) {
    this.gateUrl = gateUrl;
    this.logger = logger;
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.batchSize = 100; // Размер батча для отправки
  }

  /**
   * Логирование
   */
  log(message, type = 'INFO') {
    if (this.logger) {
      this.logger(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  /**
   * Отправляет массив ID на гейт
   */
  async sendIds(ids, source = 'parser', retryCount = 0) {
    if (!Array.isArray(ids) || ids.length === 0) {
      this.log('⚠️ Массив ID пуст или не является массивом', 'WARN');
      return { success: false, error: 'Empty or invalid IDs array' };
    }

    try {
      this.log(`📤 Отправляем ${ids.length} ID на гейт: ${this.gateUrl}`, 'INFO');

      const response = await fetch(this.gateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: ids,
          source: source
        }),
        signal: AbortSignal.timeout(30000) // 30 секунд таймаут
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Ошибка парсинга ответа: ${parseError.message}. Ответ: ${responseText}`);
      }

      if (response.ok) {
        this.log(`✅ ID успешно отправлены на гейт`, 'SUCCESS');
        this.log(`📊 Статистика: Добавлено: ${result.data?.added || 0}, Пропущено: ${result.data?.skipped || 0}, Ошибок: ${result.data?.errors || 0}`, 'INFO');
        
        if (result.data?.errors > 0) {
          this.log(`⚠️ Обработано с ошибками: ${result.data.error_details?.join(', ') || 'неизвестно'}`, 'WARN');
        }

        return {
          success: true,
          data: result.data,
          message: result.message
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${result.message || responseText}`);
      }

    } catch (error) {
      this.log(`❌ Ошибка отправки ID на гейт: ${error.message}`, 'ERROR');

      // Повторная попытка
      if (retryCount < this.maxRetries) {
        this.log(`🔄 Повторная попытка ${retryCount + 1}/${this.maxRetries} через ${this.retryDelay/1000} сек...`, 'WARN');
        await this.delay(this.retryDelay);
        return await this.sendIds(ids, source, retryCount + 1);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Отправляет ID батчами
   */
  async sendIdsInBatches(ids, source = 'parser') {
    if (!Array.isArray(ids) || ids.length === 0) {
      this.log('⚠️ Массив ID пуст или не является массивом', 'WARN');
      return { success: false, error: 'Empty or invalid IDs array' };
    }

    const batches = this.createBatches(ids, this.batchSize);
    const results = {
      totalProcessed: 0,
      totalAdded: 0,
      totalSkipped: 0,
      totalErrors: 0,
      batchResults: []
    };

    this.log(`📦 Отправляем ${ids.length} ID в ${batches.length} батчах по ${this.batchSize}`, 'INFO');

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.log(`📤 Отправляем батч ${i + 1}/${batches.length} (${batch.length} ID)`, 'INFO');

      const result = await this.sendIds(batch, source);

      if (result.success) {
        results.totalProcessed += batch.length;
        results.totalAdded += result.data?.added || 0;
        results.totalSkipped += result.data?.skipped || 0;
        results.totalErrors += result.data?.errors || 0;
        results.batchResults.push({
          batch: i + 1,
          success: true,
          data: result.data
        });
      } else {
        results.batchResults.push({
          batch: i + 1,
          success: false,
          error: result.error
        });
        this.log(`❌ Ошибка в батче ${i + 1}: ${result.error}`, 'ERROR');
      }

      // Небольшая пауза между батчами
      if (i < batches.length - 1) {
        await this.delay(1000);
      }
    }

    this.log(`📊 Итоговая статистика отправки: Обработано: ${results.totalProcessed}, Добавлено: ${results.totalAdded}, Пропущено: ${results.totalSkipped}, Ошибок: ${results.totalErrors}`, 'INFO');

    return {
      success: results.totalProcessed > 0,
      data: results
    };
  }

  /**
   * Создает батчи из массива
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Проверяет доступность гейта
   */
  async checkGateHealth() {
    try {
      this.log(`🔍 Проверяем доступность гейта: ${this.gateUrl}`, 'INFO');

      const response = await fetch(this.gateUrl, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        this.log(`✅ Гейт доступен`, 'SUCCESS');
        return true;
      } else {
        this.log(`⚠️ Гейт отвечает со статусом: ${response.status}`, 'WARN');
        return false;
      }
    } catch (error) {
      this.log(`❌ Гейт недоступен: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Задержка
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получает статистику гейта
   */
  getStats() {
    return {
      gateUrl: this.gateUrl,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      batchSize: this.batchSize
    };
  }
}
