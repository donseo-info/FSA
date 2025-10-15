<?php
/**
 * Скрипт инициализации базы данных
 * Создает все необходимые таблицы и индексы
 */

// Подключаем RedBean ORM
require_once __DIR__ . '/rb-mysql.php';

// Настройки базы данных
$dbPath = 'sqlite:proxy_manager.db';

/**
 * Функция для логирования
 */
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    echo $logMessage;
    error_log($logMessage, 3, __DIR__ . '/install_db.log');
}

/**
 * Функция для выполнения SQL с обработкой ошибок
 */
function executeSQL($sql, $description) {
    try {
        R::exec($sql);
        logMessage("✅ {$description}");
        return true;
    } catch (Exception $e) {
        logMessage("❌ Ошибка при {$description}: " . $e->getMessage(), 'ERROR');
        return false;
    }
}

/**
 * Функция для проверки существования таблицы
 */
function tableExists($tableName) {
    try {
        $result = R::getRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [$tableName]);
        return !empty($result);
    } catch (Exception $e) {
        return false;
    }
}

try {
    logMessage("🚀 Начинаем инициализацию базы данных...");
    
    // Подключаемся к базе данных
    R::setup($dbPath);
    
    // Настройки RedBean для работы с SQLite
    R::freeze(false); // Разрешаем создание новых таблиц
    R::useFeatureSet('novice/latest'); // Используем последние возможности
    
    R::testConnection();
    logMessage("✅ Подключение к базе данных установлено");
    
    // Проверяем, существует ли база данных
    if (!file_exists('proxy_manager.db')) {
        logMessage("📁 Создаем новый файл базы данных");
    } else {
        logMessage("📁 Используем существующий файл базы данных");
    }
    
    // Создаем таблицу parsed_ids
    if (!tableExists('parsed_ids')) {
        $createParsedIdsSQL = "
            CREATE TABLE parsed_ids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                declaration_id INTEGER UNIQUE NOT NULL,
                source VARCHAR(50) DEFAULT 'parser',
                date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
                use_status INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ";
        executeSQL($createParsedIdsSQL, "создании таблицы parsed_ids");
    } else {
        logMessage("ℹ️ Таблица parsed_ids уже существует");
    }
    
    // Создаем индексы для таблицы parsed_ids
    $indexes = [
        "CREATE INDEX IF NOT EXISTS idx_parsed_ids_declaration_id ON parsed_ids(declaration_id)" => "создании индекса declaration_id",
        "CREATE INDEX IF NOT EXISTS idx_parsed_ids_source ON parsed_ids(source)" => "создании индекса source",
        "CREATE INDEX IF NOT EXISTS idx_parsed_ids_date_added ON parsed_ids(date_added)" => "создании индекса date_added",
        "CREATE INDEX IF NOT EXISTS idx_parsed_ids_use_status ON parsed_ids(use_status)" => "создании индекса use_status",
        "CREATE INDEX IF NOT EXISTS idx_parsed_ids_created_at ON parsed_ids(created_at)" => "создании индекса created_at"
    ];
    
    foreach ($indexes as $sql => $description) {
        executeSQL($sql, $description);
    }
    
    // Создаем таблицу для логов (опционально)
    if (!tableExists('system_logs')) {
        $createLogsSQL = "
            CREATE TABLE system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level VARCHAR(10) NOT NULL,
                message TEXT NOT NULL,
                context TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ";
        executeSQL($createLogsSQL, "создании таблицы system_logs");
    } else {
        logMessage("ℹ️ Таблица system_logs уже существует");
    }
    
    // Создаем индексы для таблицы логов
    $logIndexes = [
        "CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)" => "создании индекса level для логов",
        "CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at)" => "создании индекса created_at для логов"
    ];
    
    foreach ($logIndexes as $sql => $description) {
        executeSQL($sql, $description);
    }
    
    // Создаем таблицу для настроек системы (опционально)
    if (!tableExists('system_settings')) {
        $createSettingsSQL = "
            CREATE TABLE system_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ";
        executeSQL($createSettingsSQL, "создании таблицы system_settings");
        
        // Добавляем базовые настройки
        $defaultSettings = [
            ['parser_enabled', '1', 'Включен ли парсер'],
            ['parser_delay', '3000', 'Задержка между запросами (мс)'],
            ['parser_max_pages', '10', 'Максимальное количество страниц для парсинга'],
            ['telegram_enabled', '1', 'Включены ли уведомления в Telegram'],
            ['database_auto_cleanup', '0', 'Автоматическая очистка старых записей'],
            ['cleanup_days', '30', 'Количество дней для хранения записей']
        ];
        
        foreach ($defaultSettings as $setting) {
            $record = R::dispense('system_settings');
            $record->setting_key = $setting[0];
            $record->setting_value = $setting[1];
            $record->description = $setting[2];
            $record->created_at = date('Y-m-d H:i:s');
            $record->updated_at = date('Y-m-d H:i:s');
            R::store($record);
        }
        
        logMessage("✅ Добавлены базовые настройки системы");
    } else {
        logMessage("ℹ️ Таблица system_settings уже существует");
    }
    
    // Создаем индекс для настроек
    executeSQL(
        "CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key)",
        "создании индекса setting_key для настроек"
    );
    
    // Проверяем целостность базы данных
    logMessage("🔍 Проверяем целостность базы данных...");
    
    $tables = ['parsed_ids', 'system_logs', 'system_settings'];
    foreach ($tables as $table) {
        if (tableExists($table)) {
            $count = R::count($table);
            logMessage("📊 Таблица {$table}: {$count} записей");
        }
    }
    
    // Закрываем соединение
    R::close();
    
    logMessage("🎉 Инициализация базы данных завершена успешно!");
    logMessage("📁 Файл базы данных: " . realpath('proxy_manager.db'));
    logMessage("📝 Лог установки: " . realpath('install_db.log'));
    
    // Показываем информацию о созданных таблицах
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "📋 СОЗДАННЫЕ ТАБЛИЦЫ:\n";
    echo str_repeat("=", 60) . "\n";
    echo "1. parsed_ids - основная таблица для хранения ID\n";
    echo "   - id (PRIMARY KEY)\n";
    echo "   - declaration_id (UNIQUE)\n";
    echo "   - source\n";
    echo "   - date_added\n";
    echo "   - use_status\n";
    echo "   - created_at, updated_at\n\n";
    
    echo "2. system_logs - таблица для системных логов\n";
    echo "   - id (PRIMARY KEY)\n";
    echo "   - level\n";
    echo "   - message\n";
    echo "   - context\n";
    echo "   - created_at\n\n";
    
    echo "3. system_settings - таблица для настроек системы\n";
    echo "   - id (PRIMARY KEY)\n";
    echo "   - setting_key (UNIQUE)\n";
    echo "   - setting_value\n";
    echo "   - description\n";
    echo "   - created_at, updated_at\n\n";
    
    echo "🔗 ПОЛЕЗНЫЕ ССЫЛКИ:\n";
    echo str_repeat("=", 60) . "\n";
    echo "• Статистика: http://localhost/DB/stats.php\n";
    echo "• Гейт API: http://localhost/DB/ids_gate.php\n";
    echo "• Лог установки: " . realpath('install_db.log') . "\n";
    echo str_repeat("=", 60) . "\n";

} catch (Exception $e) {
    logMessage("💥 Критическая ошибка при инициализации: " . $e->getMessage(), 'ERROR');
    echo "\n❌ ОШИБКА: " . $e->getMessage() . "\n";
    echo "📝 Подробности в логе: " . realpath('install_db.log') . "\n";
    exit(1);
}
?>