# Utils - Утилиты проекта

Эта папка содержит вспомогательные классы и утилиты для проекта.

## TelegramNotifier

Класс для отправки уведомлений в Telegram.

### Настройка

1. **Создайте бота в Telegram:**
   - Найдите @BotFather в Telegram
   - Отправьте команду `/newbot`
   - Следуйте инструкциям для создания бота
   - Сохраните полученный токен

2. **Узнайте ваш Chat ID:**
   - Найдите @userinfobot в Telegram
   - Отправьте ему любое сообщение
   - Он вернет ваш Chat ID

3. **Настройте конфигурацию:**
   - Откройте файл `telegram-config.js`
   - Замените `YOUR_BOT_TOKEN` на токен вашего бота
   - Замените `YOUR_CHAT_ID` на ваш Chat ID

### Использование

```javascript
import { TelegramNotifier } from './utils/TelegramNotifier.js';

// Создание экземпляра
const telegram = new TelegramNotifier();

// Отправка простого сообщения
await telegram.sendCustomMessage('Привет!');

// Отправка уведомления об успехе
await telegram.sendSuccessNotification({
  totalIds: 1000,
  uniqueIds: 950,
  totalTime: 15,
  pagesProcessed: 10,
  filename: 'ids_2025-01-01.txt',
  logFilename: 'parser_log_2025-01-01.txt'
});

// Проверка подключения
const isConnected = await telegram.checkConnection();
```

### Методы

- `sendMessage(message, retryCount)` - Отправка произвольного сообщения
- `sendSuccessNotification(data)` - Уведомление об успешном завершении
- `sendTimeoutNotification(data)` - Уведомление об остановке по таймауту
- `sendFailureNotification(data)` - Уведомление о неудачном завершении
- `sendCriticalErrorNotification(error)` - Уведомление о критической ошибке
- `sendCustomMessage(message)` - Отправка кастомного сообщения
- `checkConnection()` - Проверка доступности Telegram API
- `getStatus()` - Получение статуса настройки

### Конфигурация

Все настройки находятся в файле `telegram-config.js`:

- `botToken` - Токен бота
- `chatId` - ID чата для уведомлений
- `settings.enabled` - Включить/выключить уведомления
- `settings.maxMessageLength` - Максимальная длина сообщения
- `settings.timeout` - Таймаут отправки
- `settings.maxRetries` - Количество повторных попыток
- `settings.retryDelay` - Задержка между попытками

### Шаблоны сообщений

В конфигурации можно настроить шаблоны для разных типов уведомлений:

- `templates.success` - Успешное завершение
- `templates.timeout` - Остановка по таймауту
- `templates.failure` - Неудачное завершение
- `templates.criticalError` - Критическая ошибка

### Безопасность

- Токен бота и Chat ID не должны попадать в публичные репозитории
- Используйте переменные окружения для продакшена
- Регулярно обновляйте токены при необходимости
