import { telegramConfig, isTelegramConfigured } from './telegram-config.js';

/**
 * Класс для отправки уведомлений в Telegram
 */
export class TelegramNotifier {
  constructor(logger = null) {
    this.logger = logger;
    this.isConfigured = isTelegramConfigured();
    
    if (!this.isConfigured) {
      this.log('⚠️ Telegram не настроен - уведомления отключены', 'WARN');
    } else {
      this.log('✅ Telegram уведомления включены', 'SUCCESS');
    }
  }

  /**
   * Логирование (если передан logger)
   */
  log(message, type = 'INFO') {
    if (this.logger) {
      this.logger(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  /**
   * Отправляет сообщение в Telegram
   */
  async sendMessage(message, retryCount = 0) {
    if (!this.isConfigured) {
      this.log('⚠️ Telegram не настроен - пропускаем отправку', 'WARN');
      return false;
    }

    try {
      // Обрезаем сообщение если оно слишком длинное
      const truncatedMessage = message.length > telegramConfig.settings.maxMessageLength 
        ? message.substring(0, telegramConfig.settings.maxMessageLength - 3) + '...'
        : message;

      const response = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramConfig.chatId,
          text: truncatedMessage,
          parse_mode: 'HTML'
        }),
        signal: AbortSignal.timeout(telegramConfig.settings.timeout)
      });

      if (response.ok) {
        this.log('✅ Сообщение отправлено в Telegram', 'SUCCESS');
        return true;
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      this.log(`❌ Ошибка отправки в Telegram: ${error.message}`, 'ERROR');
      
      // Повторная попытка
      if (retryCount < telegramConfig.settings.maxRetries) {
        this.log(`🔄 Повторная попытка ${retryCount + 1}/${telegramConfig.settings.maxRetries}...`, 'WARN');
        await this.delay(telegramConfig.settings.retryDelay);
        return await this.sendMessage(message, retryCount + 1);
      }
      
      return false;
    }
  }

  /**
   * Отправляет уведомление об успешном завершении
   */
  async sendSuccessNotification(data) {
    const message = telegramConfig.templates.success(data);
    return await this.sendMessage(message);
  }

  /**
   * Отправляет уведомление об остановке по таймауту
   */
  async sendTimeoutNotification(data) {
    const message = telegramConfig.templates.timeout(data);
    return await this.sendMessage(message);
  }

  /**
   * Отправляет уведомление о неудачном завершении
   */
  async sendFailureNotification(data) {
    const message = telegramConfig.templates.failure(data);
    return await this.sendMessage(message);
  }

  /**
   * Отправляет уведомление о критической ошибке
   */
  async sendCriticalErrorNotification(error) {
    const message = telegramConfig.templates.criticalError(error);
    return await this.sendMessage(message);
  }

  /**
   * Отправляет кастомное сообщение
   */
  async sendCustomMessage(message) {
    return await this.sendMessage(message);
  }

  /**
   * Проверяет доступность Telegram API
   */
  async checkConnection() {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/getMe`, {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Telegram API доступен. Бот: @${data.result.username}`, 'SUCCESS');
        return true;
      } else {
        this.log(`❌ Telegram API недоступен: ${response.status}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Ошибка проверки Telegram API: ${error.message}`, 'ERROR');
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
   * Получает статус настройки
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      enabled: telegramConfig.settings.enabled,
      botToken: telegramConfig.botToken !== 'YOUR_BOT_TOKEN' ? '***' : 'не настроен',
      chatId: telegramConfig.chatId !== 'YOUR_CHAT_ID' ? '***' : 'не настроен'
    };
  }
}
