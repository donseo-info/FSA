import ProfileManager from './ProfileManager.js';

/**
 * Скрипт для просмотра статистики профилей
 */
async function showProfileStats() {
  const profileManager = new ProfileManager();
  
  console.log('🔍 Загрузка статистики профилей...\n');
  
  // Показываем статистику всех профилей
  profileManager.printProfilesStats();
  
  // Дополнительная информация
  const profiles = profileManager.getAllProfilesWithCookies();
  
  if (profiles.length > 0) {
    console.log('\n📈 Дополнительная статистика:');
    console.log('═'.repeat(50));
    
    const mostActiveProfile = profiles[0]; // Первый в списке (с наибольшим количеством куков)
    console.log(`🏆 Самый активный профиль: ${mostActiveProfile.name} (${mostActiveProfile.totalCookies} кук)`);
    
    const avgCookies = Math.round(profiles.reduce((sum, p) => sum + p.totalCookies, 0) / profiles.length);
    console.log(`📊 Среднее количество кук на профиль: ${avgCookies}`);
    
    const profilesWithCookies = profiles.filter(p => p.totalCookies > 0).length;
    console.log(`🍪 Профилей с куками: ${profilesWithCookies} из ${profiles.length}`);
    
    // Информация о доменах больше не доступна (оптимизация)
    console.log('\n💡 Детальная информация о доменах не сохраняется для экономии места.');
  }
  
  console.log('\n✅ Статистика загружена успешно!');
}

// Запускаем скрипт
showProfileStats().catch(error => {
  console.error('❌ Ошибка загрузки статистики:', error.message);
  process.exit(1);
});
