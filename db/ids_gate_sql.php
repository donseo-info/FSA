<?php
/**
 * Гейт для работы с ID из парсера (только SQL версия)
 * Принимает ID и записывает их в базу данных без RedBean
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Функция для логирования
 */
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    error_log($logMessage, 3, __DIR__ . '/ids_gate.log');
}

/**
 * Функция для отправки JSON ответа
 */
function sendResponse($success, $message, $data = null, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Функция для подключения к базе данных
 */
function connectToDatabase() {
    try {
        $dbPath = __DIR__ . '/proxy_manager.db';
        $pdo = new PDO("sqlite:{$dbPath}");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (Exception $e) {
        throw new Exception("Ошибка подключения к базе данных: " . $e->getMessage());
    }
}

try {
    // Проверяем метод запроса
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(false, 'Только POST запросы разрешены', null, 405);
    }

    // Получаем данные из запроса
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse(false, 'Ошибка парсинга JSON: ' . json_last_error_msg(), null, 400);
    }

    // Проверяем наличие обязательных полей
    if (!isset($data['ids']) || !is_array($data['ids'])) {
        sendResponse(false, 'Поле "ids" обязательно и должно быть массивом', null, 400);
    }

    $ids = $data['ids'];
    $source = $data['source'] ?? 'parser'; // Источник данных (по умолчанию parser)

    if (empty($ids)) {
        sendResponse(false, 'Массив ID не может быть пустым', null, 400);
    }

    logMessage("Получен запрос на добавление " . count($ids) . " ID от источника: {$source}");

    // Подключаемся к базе данных
    $pdo = connectToDatabase();
    logMessage("Подключение к базе данных установлено");

    // Создаем таблицу если её нет
    $createTableSQL = "
        CREATE TABLE IF NOT EXISTS parsed_ids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            declaration_id INTEGER UNIQUE NOT NULL,
            source VARCHAR(50) DEFAULT 'parser',
            date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
            use_status INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ";
    
    $pdo->exec($createTableSQL);
    logMessage("Таблица parsed_ids создана или проверена");

    $addedCount = 0;
    $skippedCount = 0;
    $errorCount = 0;
    $errors = [];

    // Обрабатываем каждый ID
    foreach ($ids as $id) {
        try {
            // Проверяем, что ID является числом
            if (!is_numeric($id)) {
                $errors[] = "ID '{$id}' не является числом";
                $errorCount++;
                continue;
            }

            $declarationId = (int)$id;

            // Проверяем, существует ли уже такой ID
            $stmt = $pdo->prepare('SELECT id FROM parsed_ids WHERE declaration_id = ?');
            $stmt->execute([$declarationId]);
            $existing = $stmt->fetch();

            if ($existing) {
                $skippedCount++;
                logMessage("ID {$declarationId} уже существует в базе, пропускаем");
                continue;
            }

            // Создаем новую запись
            $insertSQL = "
                INSERT INTO parsed_ids (declaration_id, source, date_added, use_status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ";
            
            $currentTime = date('Y-m-d H:i:s');
            $stmt = $pdo->prepare($insertSQL);
            $stmt->execute([$declarationId, $source, $currentTime, 0, $currentTime, $currentTime]);
            
            $addedCount++;
            logMessage("Добавлен ID {$declarationId} через прямой SQL");

        } catch (Exception $e) {
            $errorCount++;
            $errors[] = "Ошибка при обработке ID '{$id}': " . $e->getMessage();
            logMessage("Ошибка при обработке ID {$id}: " . $e->getMessage(), 'ERROR');
        }
    }

    // Формируем результат
    $result = [
        'total_received' => count($ids),
        'added' => $addedCount,
        'skipped' => $skippedCount,
        'errors' => $errorCount,
        'error_details' => $errors
    ];

    logMessage("Обработка завершена. Добавлено: {$addedCount}, Пропущено: {$skippedCount}, Ошибок: {$errorCount}");

    if ($errorCount > 0) {
        sendResponse(true, "Обработка завершена с ошибками", $result, 207); // 207 Multi-Status
    } else {
        sendResponse(true, "Все ID успешно обработаны", $result);
    }

} catch (Exception $e) {
    logMessage("Критическая ошибка: " . $e->getMessage(), 'ERROR');
    sendResponse(false, "Внутренняя ошибка сервера: " . $e->getMessage(), null, 500);
}
?>
