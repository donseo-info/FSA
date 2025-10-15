<?php
/**
 * Универсальное подключение к базе данных
 * Предотвращает повторные подключения RedBean ORM
 */

// Подключаем RedBean ORM только один раз
if (!class_exists('R')) {
    require_once __DIR__ . '/rb-mysql.php';
}

class Database {
    private static $connected = false;
    private static $dbPath = 'sqlite:proxy_manager.db';
    
    /**
     * Безопасное подключение к базе данных
     */
    public static function connect() {
        if (!self::$connected) {
            try {
                R::setup(self::$dbPath);
                self::$connected = true;
                
                // Настройки RedBean для работы с SQLite
                R::freeze(false); // Разрешаем создание новых таблиц
                R::useFeatureSet('novice/latest'); // Используем последние возможности
                
                // Проверяем подключение
                R::testConnection();
                
                return true;
            } catch (Exception $e) {
                error_log("Database connection error: " . $e->getMessage());
                throw new Exception("Ошибка подключения к базе данных: " . $e->getMessage());
            }
        }
        
        return true; // Уже подключены
    }
    
    /**
     * Безопасное закрытие подключения
     */
    public static function close() {
        if (self::$connected) {
            try {
                R::close();
                self::$connected = false;
            } catch (Exception $e) {
                // Игнорируем ошибки закрытия
                error_log("Database close error: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Проверка состояния подключения
     */
    public static function isConnected() {
        return self::$connected;
    }
    
    /**
     * Получение пути к базе данных
     */
    public static function getDbPath() {
        return self::$dbPath;
    }
    
    /**
     * Установка пути к базе данных
     */
    public static function setDbPath($path) {
        if (!self::$connected) {
            self::$dbPath = $path;
        } else {
            throw new Exception("Нельзя изменить путь к БД после подключения");
        }
    }
    
    /**
     * Принудительное переподключение
     */
    public static function reconnect() {
        self::close();
        self::$connected = false;
        return self::connect();
    }
}

// Автоматическое подключение отключено для избежания конфликтов
// Database::connect();

?>