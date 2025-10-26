import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Профиль отчета
 */
function generateProfileReport() {
  const metadataPath = path.join(__dirname, 'profiles', 'metadata.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Файл profiles/metadata.json не найден!');
    process.exit(1);
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const profiles = Object.values(metadata.profiles || {});
  
  console.log('\n📊 СВОДКА ПО ПРОФИЛЯМ\n');
  console.log('═'.repeat(120));
  
  // Заголовки
  console.log(
    'Профиль'.padEnd(20) + 
    'Создан'.padEnd(12) + 
    'Дней назад'.padEnd(12) + 
    'Доменов'.padEnd(10) + 
    'Последнее исп-е'.padEnd(20) + 
    'Минут назад'
  );
  console.log('═'.repeat(120));
  
  // Данные
  profiles.forEach(profile => {
    const createdAt = profile.createdAt ? new Date(profile.createdAt) : null;
    const createdAtStr = createdAt ? createdAt.toLocaleDateString('ru-RU') : 'неизвестно';
    const daysSince = createdAt ? Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24)) : 0;
    const domainsCount = profile.cookies ? (profile.cookies.uniqueDomains || 0) : 0;
    const lastUsed = profile.lastUsed ? new Date(profile.lastUsed) : null;
    const lastUsedStr = lastUsed ? lastUsed.toLocaleString('ru-RU') : 'никогда';
    const minutesAgo = lastUsed ? Math.floor((new Date() - lastUsed) / (1000 * 60)) : '∞';
    
    console.log(
      (profile.name || 'unknown').padEnd(20) + 
      createdAtStr.padEnd(12) + 
      `${daysSince} дн.`.padEnd(12) + 
      `${domainsCount}`.padEnd(10) + 
      lastUsedStr.padEnd(20) + 
      (minutesAgo === '∞' ? '∞' : `${minutesAgo} мин.`)
    );
  });
  
  console.log('═'.repeat(120));
  console.log(`\n📈 Всего профилей: ${profiles.length}`);
  
  // Статистика
  const totalDomains = profiles.reduce((sum, p) => sum + ((p.cookies?.uniqueDomains) || 0), 0);
  const avgDomains = profiles.length > 0 ? Math.floor(totalDomains / profiles.length) : 0;
  const profilesNeverUsed = profiles.filter(p => !p.lastUsed).length;
  const profilesUsedToday = profiles.filter(p => {
    if (!p.lastUsed) return false;
    const lastUsedDate = new Date(p.lastUsed);
    const today = new Date();
    return lastUsedDate.toDateString() === today.toDateString();
  }).length;
  
  console.log(`📊 Среднее кол-во доменов: ${avgDomains}`);
  console.log(`🆕 Никогда не использовались: ${profilesNeverUsed}`);
  console.log(`✅ Использовались сегодня: ${profilesUsedToday}`);
  console.log(`⚪ Доступно для работы: ${profilesUsedToday > 0 ? profilesNeverUsed + (profiles.length - profilesUsedToday) : profiles.length}`);
  
  // Фильтрация по текущим фильтрам из starter-multi-surfer.js
  console.log('\n🔍 ФИЛЬТРОВАННАЯ СТАТИСТИКА:');
  
  const now = new Date();
  const cooldownMinutes = 10; // Как в starter-multi-surfer.js
  
  // Фильтр 1: cooldownMinutes (не работали более 10 минут)
  const filteredByCooldown = profiles.filter(profile => {
    if (!profile.lastUsed) return true;
    const lastUsed = new Date(profile.lastUsed);
    const minutesAgo = Math.floor((now - lastUsed) / (1000 * 60));
    return minutesAgo >= cooldownMinutes;
  });
  console.log(`   ✅ Прошло cooldown (${cooldownMinutes} мин.): ${filteredByCooldown.length} профилей`);
  
  // Фильтр 2: createdAt (младше 7 дней) - опциональный
  const createdAtDays = 7;
  const filteredByAge = filteredByCooldown.filter(profile => {
    if (!profile.createdAt) return false;
    const createdAt = new Date(profile.createdAt);
    const daysSince = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    return daysSince < createdAtDays;
  });
  console.log(`   📅 Создан менее ${createdAtDays} дней назад: ${filteredByAge.length} профилей`);
  
  // Фильтр 3: domainsCount (меньше 100 доменов) - опциональный
  const domainsCount = 100;
  const filteredByDomains = filteredByCooldown.filter(profile => {
    const domains = profile.cookies ? (profile.cookies.uniqueDomains || 0) : 0;
    return domains < domainsCount;
  });
  console.log(`   🌐 Меньше ${domainsCount} доменов: ${filteredByDomains.length} профилей`);
  
  // Комбинированный фильтр: cooldown + age + domains
  const combinedFilter = profiles.filter(profile => {
    // cooldown
    if (profile.lastUsed) {
      const lastUsed = new Date(profile.lastUsed);
      const minutesAgo = Math.floor((now - lastUsed) / (1000 * 60));
      if (minutesAgo < cooldownMinutes) return false;
    }
    // age (опционально - закомментировано)
    // if (profile.createdAt) {
    //   const createdAt = new Date(profile.createdAt);
    //   const daysSince = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    //   if (daysSince >= createdAtDays) return false;
    // }
    // domains (опционально - закомментировано)
    // const domains = profile.cookies ? (profile.cookies.uniqueDomains || 0) : 0;
    // if (domains >= domainsCount) return false;
    return true;
  });
  console.log(`   🎯 ПРОЙДЕТ ВЫБОРКУ (с текущими фильтрами): ${combinedFilter.length} профилей\n`);
}

// Запускаем отчет напрямую
generateProfileReport();

export { generateProfileReport };

