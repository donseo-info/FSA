import { ProfileGenerator } from './managers/ProfileGenerator.js';

/**
 * Удаляет профиль
 */
async function deleteProfile(profileName) {
  try {
    const generator = new ProfileGenerator();
    
    if (!generator.profileExists(profileName)) {
      console.error(`❌ Профиль "${profileName}" не найден!`);
      process.exit(1);
    }
    
    console.log(`🗑️ Удаляем профиль: ${profileName}`);
    
    // Показываем информацию о профиле перед удалением
    const profile = generator.getProfileConfig(profileName);
    console.log(`📋 Информация о профиле:`);
    console.log(`   🖥️ Устройство: ${profile.deviceName}`);
    console.log(`   📐 Разрешение: ${profile.resolution.width}x${profile.resolution.height}`);
    console.log(`   🗣️ Язык: ${profile.locale}`);
    console.log(`   💻 Железо: ${profile.hardware.cores} ядер, ${profile.hardware.memory} GB`);
    console.log(`   🎮 GPU: ${profile.webgl.renderer}`);
    
    if (profile.plugins && profile.plugins.length > 0) {
      console.log(`   🔌 Плагины (${profile.plugins.length}):`);
      profile.plugins.forEach(plugin => {
        console.log(`      📦 ${plugin.name} v${plugin.version} (${plugin.id})`);
      });
    } else {
      console.log(`   🔌 Плагины: нет`);
    }
    
    console.log(`   📅 Создан: ${new Date(profile.createdAt).toLocaleString()}`);
    
    // Удаляем профиль
    generator.deleteProfile(profileName);
    
    console.log(`✅ Профиль "${profileName}" успешно удален!`);
    
    // Показываем оставшиеся профили
    const remainingProfiles = generator.getAllProfiles();
    console.log(`\n📊 Осталось профилей: ${remainingProfiles.length}`);
    
    if (remainingProfiles.length > 0) {
      console.log(`📋 Оставшиеся профили:`);
      remainingProfiles.forEach(profile => {
        const name = typeof profile === 'string' ? profile : profile.name || profile;
        console.log(`   - ${name}`);
      });
    }
    
  } catch (error) {
    console.error(`❌ Ошибка удаления профиля: ${error.message}`);
    process.exit(1);
  }
}

// ========================================
// ИСПОЛЬЗОВАНИЕ
// ========================================

const args = process.argv.slice(2);
const profileName = args[0];

if (!profileName) {
  console.log('❌ Укажите имя профиля для удаления!');
  console.log('Использование: node delete-profile.js <имя_профиля>');
  console.log('Примеры:');
  console.log('  node delete-profile.js bot-123456789');
  console.log('  node delete-profile.js test-profile');
  process.exit(1);
}

await deleteProfile(profileName);
