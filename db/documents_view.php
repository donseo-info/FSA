<?php
require_once 'database.php';

// Устанавливаем путь к базе документов
Database::setDbPath('sqlite:documents.db');
Database::connect();

// Получаем параметры
$action = $_GET['action'] ?? 'view';
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = 20;
$offset = ($page - 1) * $limit;

// Обработка действий
if ($action === 'clear' && isset($_GET['confirm']) && $_GET['confirm'] === 'yes') {
    try {
        R::exec('DELETE FROM documents');
        R::exec('DELETE FROM applicants');
        R::exec('DELETE FROM manufacturers');
        R::exec('DELETE FROM products');
        R::exec('DELETE FROM testinglabs');
        R::exec('DELETE FROM contacts');
        R::exec('DELETE FROM addresses');
        R::exec('DELETE FROM documents_logs');
        $message = "✅ База данных успешно очищена!";
        $messageType = "success";
    } catch (Exception $e) {
        $message = "❌ Ошибка очистки базы: " . $e->getMessage();
        $messageType = "error";
    }
}

// Получаем статистику
try {
    $totalDocuments = R::count('documents');
    $totalApplicants = R::count('applicants');
    $totalManufacturers = R::count('manufacturers');
    $totalProducts = R::count('products');
    $totalTestingLabs = R::count('testinglabs');
    $totalContacts = R::count('contacts');
    
    // Статистика по дням
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $dayBeforeYesterday = date('Y-m-d', strtotime('-2 days'));
    
    $addedToday = R::count('documents', 'DATE(created_at) = ?', [$today]);
    $addedYesterday = R::count('documents', 'DATE(created_at) = ?', [$yesterday]);
    $addedDayBeforeYesterday = R::count('documents', 'DATE(created_at) = ?', [$dayBeforeYesterday]);
    
    // Получаем документы с пагинацией
    $documents = R::find('documents', 'ORDER BY created_at DESC LIMIT ? OFFSET ?', [$limit, $offset]);
    
    // Получаем общее количество для пагинации
    $totalPages = ceil($totalDocuments / $limit);
    
} catch (Exception $e) {
    $error = "Ошибка получения данных: " . $e->getMessage();
}

Database::close();
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Просмотр базы документов</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.8;
            font-size: 1.1em;
        }
        
        .content {
            padding: 30px;
        }
        
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
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
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-card h3 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .stat-card p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .daily-stats {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .daily-stats h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        
        .daily-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .daily-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .daily-item .number {
            font-size: 1.8em;
            font-weight: bold;
            color: #3498db;
        }
        
        .daily-item .label {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .documents-table {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .table-header {
            background: #34495e;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .table-header h3 {
            font-size: 1.4em;
        }
        
        .actions {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .btn-danger:hover {
            background: #c0392b;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2980b9;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .status-6 { background: #d4edda; color: #155724; }
        .status-14 { background: #fff3cd; color: #856404; }
        .status-15 { background: #cce5ff; color: #004085; }
        
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-top: 20px;
        }
        
        .pagination a, .pagination span {
            padding: 8px 12px;
            border: 1px solid #ddd;
            text-decoration: none;
            color: #333;
            border-radius: 4px;
        }
        
        .pagination a:hover {
            background: #f8f9fa;
        }
        
        .pagination .current {
            background: #3498db;
            color: white;
            border-color: #3498db;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #7f8c8d;
            font-size: 1.1em;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background: white;
            margin: 15% auto;
            padding: 30px;
            border-radius: 10px;
            width: 90%;
            max-width: 500px;
            text-align: center;
        }
        
        .modal h3 {
            color: #e74c3c;
            margin-bottom: 20px;
        }
        
        .modal p {
            margin-bottom: 20px;
            color: #555;
        }
        
        .modal-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 База документов FSA</h1>
            <p>Просмотр и управление собранными данными</p>
        </div>
        
        <div class="content">
            <?php if (isset($message)): ?>
                <div class="message <?= $messageType ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <?php if (isset($error)): ?>
                <div class="message error">
                    <?= htmlspecialchars($error) ?>
                </div>
            <?php else: ?>
                <!-- Общая статистика -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3><?= number_format($totalDocuments) ?></h3>
                        <p>📄 Документов</p>
                    </div>
                    <div class="stat-card">
                        <h3><?= number_format($totalApplicants) ?></h3>
                        <p>🏢 Заявителей</p>
                    </div>
                    <div class="stat-card">
                        <h3><?= number_format($totalManufacturers) ?></h3>
                        <p>🏭 Изготовителей</p>
                    </div>
                    <div class="stat-card">
                        <h3><?= number_format($totalProducts) ?></h3>
                        <p>📦 Продукции</p>
                    </div>
                    <div class="stat-card">
                        <h3><?= number_format($totalTestingLabs) ?></h3>
                        <p>🔬 Лабораторий</p>
                    </div>
                    <div class="stat-card">
                        <h3><?= number_format($totalContacts) ?></h3>
                        <p>📞 Контактов</p>
                    </div>
                </div>
                
                <!-- Статистика по дням -->
                <div class="daily-stats">
                    <h3>📅 Статистика по дням</h3>
                    <div class="daily-grid">
                        <div class="daily-item">
                            <div class="number"><?= $addedToday ?></div>
                            <div class="label">Сегодня</div>
                        </div>
                        <div class="daily-item">
                            <div class="number"><?= $addedYesterday ?></div>
                            <div class="label">Вчера</div>
                        </div>
                        <div class="daily-item">
                            <div class="number"><?= $addedDayBeforeYesterday ?></div>
                            <div class="label">Позавчера</div>
                        </div>
                    </div>
                </div>
                
                <!-- Таблица документов -->
                <div class="documents-table">
                    <div class="table-header">
                        <h3>📋 Последние документы</h3>
                        <div class="actions">
                            <a href="?action=view" class="btn btn-primary">🔄 Обновить</a>
                            <a href="#" onclick="showClearModal()" class="btn btn-danger">🗑️ Очистить базу</a>
                        </div>
                    </div>
                    
                    <?php if (empty($documents)): ?>
                        <div class="no-data">
                            📭 База данных пуста
                        </div>
                    <?php else: ?>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Номер</th>
                                    <th>Статус</th>
                                    <th>Дата регистрации</th>
                                    <th>Дата окончания</th>
                                    <th>Заявитель</th>
                                    <th>Email</th>
                                    <th>Создан</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($documents as $doc): ?>
                                    <?php
                                    // Получаем данные заявителя
                                    $applicant = R::findOne('applicants', 'document_id = ?', [$doc->document_id]);
                                    ?>
                                    <tr>
                                        <td><strong><?= htmlspecialchars($doc->document_id) ?></strong></td>
                                        <td><?= htmlspecialchars($doc->number ?? 'Не указан') ?></td>
                                        <td>
                                            <span class="status-badge status-<?= $doc->id_status ?>">
                                                <?= $doc->id_status ?? 'Не указан' ?>
                                            </span>
                                        </td>
                                        <td><?= htmlspecialchars($doc->decl_reg_date ?? 'Не указана') ?></td>
                                        <td><?= htmlspecialchars($doc->decl_end_date ?? 'Не указана') ?></td>
                                        <td>
                                            <?php if ($applicant): ?>
                                                <?= htmlspecialchars($applicant->full_name ?? 'Не указан') ?>
                                            <?php else: ?>
                                                <em>Не найден</em>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <?php if ($applicant && $applicant->email): ?>
                                                <a href="mailto:<?= htmlspecialchars($applicant->email) ?>">
                                                    <?= htmlspecialchars($applicant->email) ?>
                                                </a>
                                            <?php else: ?>
                                                <em>Не указан</em>
                                            <?php endif; ?>
                                        </td>
                                        <td><?= date('d.m.Y H:i', strtotime($doc->created_at)) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        
                        <!-- Пагинация -->
                        <?php if ($totalPages > 1): ?>
                            <div class="pagination">
                                <?php if ($page > 1): ?>
                                    <a href="?page=<?= $page - 1 ?>">« Предыдущая</a>
                                <?php endif; ?>
                                
                                <?php for ($i = max(1, $page - 2); $i <= min($totalPages, $page + 2); $i++): ?>
                                    <?php if ($i == $page): ?>
                                        <span class="current"><?= $i ?></span>
                                    <?php else: ?>
                                        <a href="?page=<?= $i ?>"><?= $i ?></a>
                                    <?php endif; ?>
                                <?php endfor; ?>
                                
                                <?php if ($page < $totalPages): ?>
                                    <a href="?page=<?= $page + 1 ?>">Следующая »</a>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Модальное окно подтверждения очистки -->
    <div id="clearModal" class="modal">
        <div class="modal-content">
            <h3>⚠️ Подтверждение очистки</h3>
            <p>Вы действительно хотите очистить всю базу данных?<br>
            <strong>Это действие нельзя отменить!</strong></p>
            <div class="modal-actions">
                <a href="?action=clear&confirm=yes" class="btn btn-danger">Да, очистить</a>
                <a href="#" onclick="hideClearModal()" class="btn btn-primary">Отмена</a>
            </div>
        </div>
    </div>
    
    <script>
        function showClearModal() {
            document.getElementById('clearModal').style.display = 'block';
        }
        
        function hideClearModal() {
            document.getElementById('clearModal').style.display = 'none';
        }
        
        // Закрытие модального окна при клике вне его
        window.onclick = function(event) {
            const modal = document.getElementById('clearModal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    </script>
</body>
</html>
