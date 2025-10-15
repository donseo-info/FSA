<?php
/**
 * Страница статистики базы данных
 * Показывает информацию о данных и позволяет очистить базу
 */

require_once __DIR__ . '/database.php';

// Функция для безопасного вывода
function h($text) {
    return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

// Функция для форматирования чисел
function formatNumber($number) {
    return number_format($number, 0, ',', ' ');
}

// Обработка GET параметров
$action = $_GET['action'] ?? '';
$confirm = $_GET['confirm'] ?? '';

// Обработка очистки базы данных
if ($action === 'clear' && $confirm === 'yes') {
    try {
        Database::connect();
        
        // Получаем количество записей перед удалением
        $totalRecords = R::count('parsed_ids');
        
        // Очищаем базу данных
        R::exec('DELETE FROM parsed_ids');
        R::exec('DELETE FROM sqlite_sequence WHERE name="parsed_ids"'); // Сбрасываем автоинкремент
        
        $message = "База данных очищена. Удалено записей: " . formatNumber($totalRecords);
        $messageType = 'success';
        
        Database::close();
    } catch (Exception $e) {
        $message = "Ошибка при очистке базы данных: " . h($e->getMessage());
        $messageType = 'error';
    }
}

// Получаем статистику
try {
    Database::connect();
    
    // Общая статистика
    $totalRecords = R::count('parsed_ids');
    $unusedRecords = R::count('parsed_ids', 'use_status = 0');
    $usedRecords = R::count('parsed_ids', 'use_status = 1');
    
    // Статистика по дням
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $dayBeforeYesterday = date('Y-m-d', strtotime('-2 days'));
    
    $todayCount = R::count('parsed_ids', 'DATE(date_added) = ?', [$today]);
    $yesterdayCount = R::count('parsed_ids', 'DATE(date_added) = ?', [$yesterday]);
    $dayBeforeYesterdayCount = R::count('parsed_ids', 'DATE(date_added) = ?', [$dayBeforeYesterday]);
    
    // Статистика по источникам
    $sources = R::getAll('SELECT source, COUNT(*) as count FROM parsed_ids GROUP BY source ORDER BY count DESC');
    
    // Активность за 7 дней
    $weekActivity = R::getAll('
        SELECT DATE(date_added) as date, COUNT(*) as count 
        FROM parsed_ids 
        WHERE date_added >= DATE("now", "-7 days")
        GROUP BY DATE(date_added) 
        ORDER BY date DESC
    ');
    
    // Последние записи
    $recentRecords = R::getAll('
        SELECT declaration_id, source, date_added, use_status 
        FROM parsed_ids 
        ORDER BY date_added DESC 
        LIMIT 10
    ');
    
    // Статистика по месяцам
    $monthlyStats = R::getAll('
        SELECT strftime("%Y-%m", date_added) as month, COUNT(*) as count 
        FROM parsed_ids 
        WHERE date_added >= DATE("now", "-12 months")
        GROUP BY strftime("%Y-%m", date_added) 
        ORDER BY month DESC
    ');
    
    Database::close();
    
} catch (Exception $e) {
    $error = "Ошибка при получении статистики: " . h($e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Статистика базы данных</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .content {
            padding: 30px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            border-left: 4px solid #4facfe;
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-card h3 {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .stat-card .number {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .stat-card.today { border-left-color: #28a745; }
        .stat-card.yesterday { border-left-color: #ffc107; }
        .stat-card.day-before { border-left-color: #fd7e14; }
        .stat-card.unused { border-left-color: #dc3545; }
        .stat-card.used { border-left-color: #28a745; }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 2px solid #4facfe;
            padding-bottom: 10px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .table th {
            background: #4facfe;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 500;
        }
        
        .table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .table tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-unused {
            background: #ffebee;
            color: #c62828;
        }
        
        .status-used {
            background: #e8f5e8;
            color: #2e7d32;
        }
        
        .clear-button {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 20px 0;
        }
        
        .clear-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255,107,107,0.3);
        }
        
        .message {
            padding: 15px 20px;
            border-radius: 10px;
            margin: 20px 0;
            font-weight: 500;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .confirm-dialog {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }
        
        .confirm-dialog a {
            display: inline-block;
            margin: 10px;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        
        .confirm-dialog .confirm {
            background: #dc3545;
            color: white;
        }
        
        .confirm-dialog .cancel {
            background: #6c757d;
            color: white;
        }
        
        .refresh-button {
            background: #4facfe;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        
        .auto-refresh {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Статистика базы данных</h1>
            <p>Мониторинг и управление данными парсера</p>
        </div>
        
        <div class="content">
            <?php if (isset($message)): ?>
                <div class="message <?= $messageType ?>">
                    <?= h($message) ?>
                </div>
            <?php endif; ?>
            
            <?php if (isset($error)): ?>
                <div class="message error">
                    <?= $error ?>
                </div>
            <?php else: ?>
                
                <button class="refresh-button" onclick="location.reload()">🔄 Обновить</button>
                <div class="auto-refresh">Автообновление каждые 30 секунд</div>
                
                <!-- Основная статистика -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Всего записей</h3>
                        <div class="number"><?= formatNumber($totalRecords) ?></div>
                    </div>
                    
                    <div class="stat-card today">
                        <h3>Добавлено сегодня</h3>
                        <div class="number"><?= formatNumber($todayCount) ?></div>
                    </div>
                    
                    <div class="stat-card yesterday">
                        <h3>Добавлено вчера</h3>
                        <div class="number"><?= formatNumber($yesterdayCount) ?></div>
                    </div>
                    
                    <div class="stat-card day-before">
                        <h3>Позавчера</h3>
                        <div class="number"><?= formatNumber($dayBeforeYesterdayCount) ?></div>
                    </div>
                    
                    <div class="stat-card unused">
                        <h3>Не использовано</h3>
                        <div class="number"><?= formatNumber($unusedRecords) ?></div>
                    </div>
                    
                    <div class="stat-card used">
                        <h3>Использовано</h3>
                        <div class="number"><?= formatNumber($usedRecords) ?></div>
                    </div>
                </div>
                
                <!-- Статистика по источникам -->
                <?php if (!empty($sources)): ?>
                <div class="section">
                    <h2>📈 Статистика по источникам</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Источник</th>
                                <th>Количество</th>
                                <th>Процент</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($sources as $source): ?>
                            <tr>
                                <td><?= h($source['source']) ?></td>
                                <td><?= formatNumber($source['count']) ?></td>
                                <td><?= $totalRecords > 0 ? round(($source['count'] / $totalRecords) * 100, 1) : 0 ?>%</td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
                
                <!-- Активность за 7 дней -->
                <?php if (!empty($weekActivity)): ?>
                <div class="section">
                    <h2>📅 Активность за 7 дней</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Добавлено</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($weekActivity as $day): ?>
                            <tr>
                                <td><?= h($day['date']) ?></td>
                                <td><?= formatNumber($day['count']) ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
                
                <!-- Последние записи -->
                <?php if (!empty($recentRecords)): ?>
                <div class="section">
                    <h2>🕒 Последние записи</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID декларации</th>
                                <th>Источник</th>
                                <th>Дата добавления</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recentRecords as $record): ?>
                            <tr>
                                <td><?= formatNumber($record['declaration_id']) ?></td>
                                <td><?= h($record['source']) ?></td>
                                <td><?= h($record['date_added']) ?></td>
                                <td>
                                    <span class="status-badge <?= $record['use_status'] ? 'status-used' : 'status-unused' ?>">
                                        <?= $record['use_status'] ? 'Использован' : 'Не использован' ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
                
                <!-- Статистика по месяцам -->
                <?php if (!empty($monthlyStats)): ?>
                <div class="section">
                    <h2>📊 Статистика по месяцам</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Месяц</th>
                                <th>Добавлено</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($monthlyStats as $month): ?>
                            <tr>
                                <td><?= h($month['month']) ?></td>
                                <td><?= formatNumber($month['count']) ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
                
                <!-- Управление базой данных -->
                <div class="section">
                    <h2>🗑️ Управление базой данных</h2>
                    
                    <?php if ($action === 'clear' && $confirm !== 'yes'): ?>
                        <div class="confirm-dialog">
                            <h3>⚠️ Подтверждение очистки</h3>
                            <p>Вы действительно хотите очистить базу данных?</p>
                            <p><strong>Будет удалено <?= formatNumber($totalRecords) ?> записей!</strong></p>
                            <p>Это действие необратимо!</p>
                            <a href="?action=clear&confirm=yes" class="confirm" onclick="return confirm('Вы уверены? Это действие необратимо!')">Да, очистить</a>
                            <a href="?" class="cancel">Отмена</a>
                        </div>
                    <?php else: ?>
                        <button class="clear-button" onclick="location.href='?action=clear'">
                            🗑️ Очистить базу данных
                        </button>
                    <?php endif; ?>
                </div>
                
            <?php endif; ?>
        </div>
    </div>
    
    <script>
        // Автообновление каждые 30 секунд
        setTimeout(function() {
            location.reload();
        }, 30000);
    </script>
</body>
</html>