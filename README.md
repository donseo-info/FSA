# Document Parser

Система для автоматического парсинга документов

## Описание

Проект состоит из двух основных компонентов:

1. **`parser.js`** - Сбор ID документов с истекающими сроками
2. **`batch_parser.js`** - Координатор для массовой обработки документов
3. **`document_parser_batch.js`** - Парсер конкретных документов

## Архитектура

```
parser.js (сбор ID)
    ↓
batch_parser.js (координатор)
    ↓
document_parser_batch.js (парсер)
    ↓
documents_gate_simple.php (сохранение в БД)
```

## Установка

```bash
npm install
```

## Использование

### 1. Сбор ID документов
```bash
# По умолчанию (10 дней вперед)
node parser.js bot-111806668

# С указанием количества дней
node parser.js bot-111806668 --days=

# С прокси
node parser.js bot-111806668 --proxy --days=
```

### 2. Массовая обработка документов
```bash
node batch_parser.js
```

### 3. Парсинг конкретных документов
```bash
node document_parser_batch bot-111806668 "20627515,20624535,20574634" --proxy
```

## Структура проекта

```
├── batch_parser.js              # Координатор массовой обработки
├── document_parser_batch.js     # Парсер документов
├── parser.js                    # Сбор ID документов
├── controllers/
│   └── BrowserController.js     # Управление браузером
├── managers/
│   ├── ProfileGenerator.js      # Генерация профилей браузера
│   └── ProxyManager.js          # Управление прокси
├── utils/
│   ├── DocumentsGate.js         # Класс для работы с API документов
│   └── TelegramNotifier.js      # Уведомления в Telegram
├── db/
│   ├── api.php                  # API для управления ID
│   ├── documents_gate_simple.php # Гейт для сохранения документов
│   └── install_documents_db.php # Установка базы данных
└── logs/                        # Логи и результаты парсинга
```

### База данных
База данных SQLite создается автоматически при первом запуске через `install_documents_db.php`.

## Логирование

Все логи сохраняются в папке `logs/`:
- `batch_parser_*.log` - логи координатора
- `document_parser_*.log` - логи парсера
- `document_*.json` - результаты парсинга документов

## API Endpoints

- `GET /api.php?action=get&count=N` - получить N свободных ID
- `POST /api.php?action=ok&id=ID` - отметить ID как обработанный
- `GET /api.php?action=stats` - статистика обработки
- `POST /documents_gate_simple.php` - сохранение данных документа

## Лицензия

ISC
