/**
 * Конфигурация для Telegram уведомлений
 * 
 * Для настройки:
 * 1. Создайте бота через @BotFather в Telegram
 * 2. Получите токен бота
 * 3. Узнайте ID вашего чата (можно через @userinfobot)
 * 4. Замените значения ниже
 */

export const telegramConfig = {
  // Токен вашего Telegram бота (получить у @BotFather)
  botToken: '7977683484:AAEkRwL6kJEGXuBjXtDXi-gs34dtjY60yIQ',
  
  // ID чата для отправки уведомлений (ваш личный ID или ID группы)
  chatId: '391991269',
  
  // Настройки отправки
  settings: {
    // Включить/выключить уведомления
    enabled: true,
    
    // Максимальная длина сообщения (Telegram лимит: 4096 символов)
    maxMessageLength: 4000,
    
    // Таймаут для отправки сообщения (в миллисекундах)
    timeout: 10000,
    
    // Количество повторных попыток при ошибке отправки
    maxRetries: 3,
    
    // Задержка между повторными попытками (в миллисекундах)
    retryDelay: 2000
  },
  
  // Шаблоны сообщений
  templates: {
    // Успешное завершение парсинга
    success: (data) => {
      let message = `✅ <b>Парсер завершен успешно</b>\n\n` +
        `📊 Собрано ID: ${data.totalIds}\n` +
        `📈 Уникальных ID: ${data.uniqueIds}\n` +
        `⏱️ Время работы: ${data.totalTime} минут\n` +
        `📄 Обработано страниц: ${data.pagesProcessed}/10\n` +
        `💾 Файл: ${data.filename}\n` +
        `📋 Лог: ${data.logFilename}`;
      
      // Добавляем информацию о базе данных если есть
      if (data.dbAdded !== undefined) {
        message += `\n🗄️ База данных:\n` +
          `  • Добавлено: ${data.dbAdded}\n` +
          `  • Пропущено: ${data.dbSkipped}`;
      }
      
      return message;
    },
    
    // Остановка по таймауту
    timeout: (data) => {
      return `🚨 <b>Парсер остановлен</b>\n\n` +
        `⏰ Прошло 30 минут без получения данных\n` +
        `📊 Собрано ID: ${data.totalIds}\n` +
        `⏱️ Время работы: ${data.totalTime} минут\n` +
        `📄 Обработано страниц: ${data.pagesProcessed}/10`;
    },
    
    // Неудачное завершение
    failure: (data) => {
      return `❌ <b>Парсер завершен без данных</b>\n\n` +
        `📊 Собрано ID: 0\n` +
        `⏱️ Время работы: ${data.totalTime} минут\n` +
        `📄 Обработано страниц: ${data.pagesProcessed}/10\n` +
        `📋 Лог: ${data.logFilename}`;
    },
    
    // Критическая ошибка
    criticalError: (error) => {
      return `💥 <b>Критическая ошибка парсера</b>\n\n` +
        `❌ Ошибка: ${error.message}\n` +
        `⏰ Время: ${new Date().toLocaleString('ru-RU')}`;
    }
  }
};

/**
 * Проверяет, настроен ли Telegram
 */
export function isTelegramConfigured() {
  return telegramConfig.botToken !== 'YOUR_BOT_TOKEN' && 
         telegramConfig.chatId !== 'YOUR_CHAT_ID' &&
         telegramConfig.settings.enabled;
}
