<?php
echo "<h1>Простой тест API</h1>";

// Тест статистики
echo "<h2>1. Статистика</h2>";
$statsUrl = "http://pf.loc/parser-fsa/db/api.php?action=stats";
$statsResult = file_get_contents($statsUrl);
echo "<pre>" . htmlspecialchars($statsResult) . "</pre>";

// Тест получения ID
echo "<h2>2. Получение 3 ID</h2>";
$getUrl = "http://pf.loc/parser-fsa/db/api.php?action=get&count=3";
$getResult = file_get_contents($getUrl);
echo "<pre>" . htmlspecialchars($getResult) . "</pre>";

// Парсим полученные ID
$getData = json_decode($getResult, true);
if ($getData && $getData['success'] && !empty($getData['data']['ids'])) {
    $firstId = $getData['data']['ids'][0];
    
    echo "<h2>3. Отметка ID {$firstId} как использованный</h2>";
    $okUrl = "http://pf.loc/parser-fsa/db/api.php?action=ok&id={$firstId}";
    $okResult = file_get_contents($okUrl);
    echo "<pre>" . htmlspecialchars($okResult) . "</pre>";
    
    echo "<h2>4. Сброс статуса ID {$firstId}</h2>";
    $resetUrl = "http://pf.loc/parser-fsa/db/api.php?action=reset&id={$firstId}";
    $resetResult = file_get_contents($resetUrl);
    echo "<pre>" . htmlspecialchars($resetResult) . "</pre>";
}

echo "<h2>5. Финальная статистика</h2>";
$finalStatsResult = file_get_contents($statsUrl);
echo "<pre>" . htmlspecialchars($finalStatsResult) . "</pre>";
?>
