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
    
    // Топ-5 доменов по количеству куков
    const allDomains = {};
    profiles.forEach(profile => {
      const profileData = profileManager.getProfileCookiesInfo(profile.name);
      if (profileData.domainStats) {
        Object.entries(profileData.domainStats).forEach(([domain, count]) => {
          allDomains[domain] = (allDomains[domain] || 0) + count;
        });
      }
    });
    
    const topDomains = Object.entries(allDomains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (topDomains.length > 0) {
      console.log('\n🌐 Топ-5 доменов по количеству куков:');
      topDomains.forEach(([domain, count], index) => {
        console.log(`   ${index + 1}. ${domain}: ${count} кук`);
      });
    }
  }
  
  console.log('\n✅ Статистика загружена успешно!');
}

// Запускаем скрипт
showProfileStats().catch(error => {
  console.error('❌ Ошибка загрузки статистики:', error.message);
  process.exit(1);
});
