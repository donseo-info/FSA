<?php
/**
 * API для управления ID документов
 * 
 * Эндпоинты:
 * ?api.php?get={count} - получить N свободных ID
 * ?api.php?ok={id} - отметить ID как использованный
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'database.php';

function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    error_log($logMessage, 3, __DIR__ . '/api.log');
}

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

try {
    // Подключаемся к базе данных ID
    Database::setDbPath('sqlite:proxy_manager.db');
    Database::connect();
    
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    
    logMessage("API запрос: {$method} ?action={$action}");
    
    // Эндпоинт: получить свободные ID
    if ($action === 'get') {
        $count = (int)($_GET['count'] ?? 1);
        
        // Валидация
        if ($count <= 0) {
            sendResponse(false, 'Количество должно быть больше 0', null, 400);
        }
        
        if ($count > 100) {
            sendResponse(false, 'Максимальное количество за один запрос: 100', null, 400);
        }
        
        logMessage("Запрос на получение {$count} свободных ID");
        
        // Получаем свободные ID (use_status = 0)
        $freeIds = R::find('parsed_ids', 'use_status = 0 ORDER BY date_added ASC LIMIT ?', [$count]);
        
        if (empty($freeIds)) {
            logMessage("Свободных ID не найдено", 'WARN');
            sendResponse(false, 'Свободных ID не найдено', ['available' => 0]);
        }
        
        $ids = [];
        foreach ($freeIds as $record) {
            $ids[] = (int)$record->declaration_id;
        }
        
        logMessage("Выдано {$count} ID: " . implode(', ', $ids), 'INFO');
        
        sendResponse(true, "Получено {$count} свободных ID", [
            'ids' => $ids,
            'count' => count($ids),
            'total_available' => R::count('parsed_ids', 'use_status = 0')
        ]);
    }
    
    // Эндпоинт: отметить ID как использованный
    elseif ($action === 'ok') {
        $id = (int)($_GET['id'] ?? 0);
        
        if ($id <= 0) {
            sendResponse(false, 'ID должен быть положительным числом', null, 400);
        }
        
        logMessage("Отмечаем ID {$id} как использованный");
        
        // Ищем запись с этим ID
        $record = R::findOne('parsed_ids', 'declaration_id = ?', [$id]);
        
        if (!$record) {
            logMessage("ID {$id} не найден в базе", 'WARN');
            sendResponse(false, "ID {$id} не найден в базе", null, 404);
        }
        
        if ($record->use_status == 1) {
            logMessage("ID {$id} уже отмечен как использованный", 'WARN');
            sendResponse(false, "ID {$id} уже отмечен как использованный", null, 409);
        }
        
        // Отмечаем как использованный
        $record->use_status = 1;
        $record->used_at = date('Y-m-d H:i:s');
        $record->updated_at = date('Y-m-d H:i:s');
        R::store($record);
        
        logMessage("ID {$id} успешно отмечен как использованный", 'INFO');
        
        sendResponse(true, "ID {$id} отмечен как использованный", [
            'id' => $id,
            'status' => 'used',
            'used_at' => $record->used_at
        ]);
    }
    
    // Эндпоинт: статистика
    elseif ($action === 'stats') {
        $total = R::count('parsed_ids');
        $used = R::count('parsed_ids', 'use_status = 1');
        $available = R::count('parsed_ids', 'use_status = 0');
        
        // Статистика по дням
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $dayBeforeYesterday = date('Y-m-d', strtotime('-2 days'));
        
        $addedToday = R::count('parsed_ids', 'DATE(date_added) = ?', [$today]);
        $addedYesterday = R::count('parsed_ids', 'DATE(date_added) = ?', [$yesterday]);
        $addedDayBeforeYesterday = R::count('parsed_ids', 'DATE(date_added) = ?', [$dayBeforeYesterday]);
        
        $usedToday = R::count('parsed_ids', 'DATE(used_at) = ? AND use_status = 1', [$today]);
        $usedYesterday = R::count('parsed_ids', 'DATE(used_at) = ? AND use_status = 1', [$yesterday]);
        
        logMessage("Запрос статистики API");
        
        sendResponse(true, "Статистика получена", [
            'total' => $total,
            'used' => $used,
            'available' => $available,
            'usage_percentage' => $total > 0 ? round(($used / $total) * 100, 2) : 0,
            'daily_stats' => [
                'added' => [
                    'today' => $addedToday,
                    'yesterday' => $addedYesterday,
                    'day_before_yesterday' => $addedDayBeforeYesterday
                ],
                'used' => [
                    'today' => $usedToday,
                    'yesterday' => $usedYesterday
                ]
            ]
        ]);
    }
    
    // Эндпоинт: сброс статуса (для тестирования)
    elseif ($action === 'reset' && isset($_GET['id'])) {
        $id = (int)($_GET['id'] ?? 0);
        
        if ($id <= 0) {
            sendResponse(false, 'ID должен быть положительным числом', null, 400);
        }
        
        logMessage("Сброс статуса для ID {$id}", 'WARN');
        
        $record = R::findOne('parsed_ids', 'declaration_id = ?', [$id]);
        
        if (!$record) {
            sendResponse(false, "ID {$id} не найден в базе", null, 404);
        }
        
        $record->use_status = 0;
        $record->used_at = null;
        $record->updated_at = date('Y-m-d H:i:s');
        R::store($record);
        
        logMessage("Статус ID {$id} сброшен", 'INFO');
        
        sendResponse(true, "Статус ID {$id} сброшен", [
            'id' => $id,
            'status' => 'available'
        ]);
    }
    
    // Неизвестный эндпоинт
    else {
        sendResponse(false, 'Неизвестный эндпоинт. Доступные: get, ok, stats, reset', null, 400);
    }
    
} catch (Exception $e) {
    logMessage("Критическая ошибка API: " . $e->getMessage(), 'ERROR');
    sendResponse(false, "Внутренняя ошибка сервера: " . $e->getMessage(), null, 500);
} finally {
    Database::close();
}
?>
