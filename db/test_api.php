<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Тест API управления ID</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .btn { padding: 10px 20px; margin: 5px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #005a87; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #218838; }
        .result { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        input { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-card { padding: 15px; background: #e9ecef; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007cba; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Тест API управления ID документов</h1>
        
        <!-- Статистика -->
        <div class="section">
            <h2>📊 Статистика</h2>
            <button class="btn" onclick="getStats()">Обновить статистику</button>
            <div id="stats" class="stats"></div>
        </div>
        
        <!-- Получение ID -->
        <div class="section">
            <h2>📥 Получение свободных ID</h2>
            <input type="number" id="getCount" value="5" min="1" max="100" placeholder="Количество">
            <button class="btn btn-success" onclick="getIds()">Получить ID</button>
            <div id="getResult" class="result"></div>
        </div>
        
        <!-- Отметка ID как использованный -->
        <div class="section">
            <h2>✅ Отметка ID как использованный</h2>
            <input type="number" id="okId" placeholder="ID документа">
            <button class="btn" onclick="markAsUsed()">Отметить как использованный</button>
            <div id="okResult" class="result"></div>
        </div>
        
        <!-- Сброс статуса -->
        <div class="section">
            <h2>🔄 Сброс статуса (для тестирования)</h2>
            <input type="number" id="resetId" placeholder="ID документа">
            <button class="btn btn-danger" onclick="resetStatus()">Сбросить статус</button>
            <div id="resetResult" class="result"></div>
        </div>
        
        <!-- Лог операций -->
        <div class="section">
            <h2>📝 Лог операций</h2>
            <div id="log" class="result"></div>
        </div>
    </div>

    <script>
        function log(message, type = 'info') {
            const logDiv = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            const className = type === 'error' ? 'error' : 'success';
            logDiv.innerHTML += `<div class="${className}">[${timestamp}] ${message}</div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        async function apiCall(action, params = {}) {
            const url = new URL('api.php', window.location.href);
            url.searchParams.set('action', action);
            
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.set(key, value);
            }
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                return data;
            } catch (error) {
                return { success: false, message: 'Ошибка сети: ' + error.message };
            }
        }
        
        async function getStats() {
            log('Запрос статистики...');
            const result = await apiCall('stats');
            
            if (result.success) {
                const stats = result.data;
                document.getElementById('stats').innerHTML = `
                    <div class="stat-card">
                        <div class="stat-number">${stats.total}</div>
                        <div>Всего ID</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.available}</div>
                        <div>Доступно</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.used}</div>
                        <div>Использовано</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.usage_percentage}%</div>
                        <div>Процент использования</div>
                    </div>
                `;
                log(`Статистика обновлена: ${stats.available} доступно, ${stats.used} использовано`);
            } else {
                log(`Ошибка получения статистики: ${result.message}`, 'error');
            }
        }
        
        async function getIds() {
            const count = document.getElementById('getCount').value;
            if (!count || count < 1) {
                log('Введите количество ID (от 1 до 100)', 'error');
                return;
            }
            
            log(`Запрос ${count} свободных ID...`);
            const result = await apiCall('get', { count });
            
            if (result.success) {
                const ids = result.data.ids;
                document.getElementById('getResult').innerHTML = `
                    <div class="success">
                        <strong>Получено ${ids.length} ID:</strong><br>
                        ${ids.join(', ')}<br>
                        <small>Всего доступно: ${result.data.total_available}</small>
                    </div>
                `;
                log(`Получено ${ids.length} ID: ${ids.join(', ')}`);
            } else {
                document.getElementById('getResult').innerHTML = `
                    <div class="error">Ошибка: ${result.message}</div>
                `;
                log(`Ошибка получения ID: ${result.message}`, 'error');
            }
        }
        
        async function markAsUsed() {
            const id = document.getElementById('okId').value;
            if (!id) {
                log('Введите ID документа', 'error');
                return;
            }
            
            log(`Отмечаем ID ${id} как использованный...`);
            const result = await apiCall('ok', { id });
            
            if (result.success) {
                document.getElementById('okResult').innerHTML = `
                    <div class="success">
                        ID ${id} отмечен как использованный<br>
                        <small>Время: ${result.data.used_at}</small>
                    </div>
                `;
                log(`ID ${id} отмечен как использованный`);
                getStats(); // Обновляем статистику
            } else {
                document.getElementById('okResult').innerHTML = `
                    <div class="error">Ошибка: ${result.message}</div>
                `;
                log(`Ошибка отметки ID: ${result.message}`, 'error');
            }
        }
        
        async function resetStatus() {
            const id = document.getElementById('resetId').value;
            if (!id) {
                log('Введите ID документа', 'error');
                return;
            }
            
            if (!confirm(`Вы уверены, что хотите сбросить статус ID ${id}?`)) {
                return;
            }
            
            log(`Сброс статуса для ID ${id}...`);
            const result = await apiCall('reset', { id });
            
            if (result.success) {
                document.getElementById('resetResult').innerHTML = `
                    <div class="success">Статус ID ${id} сброшен</div>
                `;
                log(`Статус ID ${id} сброшен`);
                getStats(); // Обновляем статистику
            } else {
                document.getElementById('resetResult').innerHTML = `
                    <div class="error">Ошибка: ${result.message}</div>
                `;
                log(`Ошибка сброса статуса: ${result.message}`, 'error');
            }
        }
        
        // Загружаем статистику при загрузке страницы
        window.onload = function() {
            getStats();
        };
    </script>
</body>
</html>
