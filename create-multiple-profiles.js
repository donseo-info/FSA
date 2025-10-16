import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { generateRandomId, formatDate } from './utils/helpers.js';

/**
 * Генерирует уникальное имя профиля
 */
function generateUniqueProfileName(generator) {
  let profileName;
  let attempts = 0;
  
  do {
    const randomId = generateRandomId();
    profileName = `bot-${randomId}`;
    attempts++;
    
    if (attempts >= 100) {
      throw new Error('Не удалось сгенерировать уникальное имя профиля');
    }
  } while (generator.profileExists(profileName));
  
  return profileName;
}

/**
 * Создает множество профилей
 */
async function createMultipleProfiles(count) {
  const generator = new ProfileGenerator({
    resolutions: [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 2560, height: 1440 },
      { width: 1680, height: 1050 },
      { width: 1600, height: 900 },
      { width: 1280, height: 720 }
    ],
    chromePaths: [
      {
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        versions: ['141.0.7390.66', '141.0.7390.65', '141.0.7390.56']
      },
      {
        path: 'F:\\Browser\\140-186\\App\\Chrome-bin\\chrome.exe',
        versions: ['140.0.6921.186']
      }
      // Добавь остальные пути к браузерам
    ]
  });

  console.log(`\n🤖 Автоматическое создание ${count} бот-профилей\n`);
  
  const createdProfiles = [];
  const startTime = Date.now();
  
  for (let i = 1; i <= count; i++) {
    try {
      const profileName = generateUniqueProfileName(generator);
      const profile = generator.createProfile(profileName);
      
      createdProfiles.push({
        name: profileName,
        resolution: `${profile.resolution.width}x${profile.resolution.height}`,
        browser: profile.chromePath.split('\\').slice(-2, -1)[0] || 'Chrome',
        locale: profile.locale,
        hardware: `${profile.hardware.cores}c/${profile.hardware.memory}GB`,
        createdAt: profile.createdAt
      });
      
      process.stdout.write(`\r✅ Создано: ${i}/${count}`);
      
    } catch (error) {
      console.error(`\n❌ Ошибка при создании профиля ${i}:`, error.message);
    }
  }
  
  const endTime = Date.now();
  const elapsed = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 СТАТИСТИКА СОЗДАНИЯ ПРОФИЛЕЙ');
  console.log('='.repeat(80));
  console.log(`✅ Успешно создано: ${createdProfiles.length}`);
  console.log(`⏱️  Время выполнения: ${elapsed} секунд`);
  console.log(`📂 Всего профилей в системе: ${generator.getAllProfiles().length}`);
  
  if (createdProfiles.length > 0) {
    console.log('\n📋 Последние созданные профили:\n');
    console.log('┌──────────────────┬──────────────┬─────────────┬────────┬──────────┬─────────────────────┐');
    console.log('│ Имя профиля      │ Разрешение   │ Браузер     │ Язык   │ Железо   │ Дата создания       │');
    console.log('├──────────────────┼──────────────┼─────────────┼────────┼──────────┼─────────────────────┤');
    
    const displayCount = Math.min(10, createdProfiles.length);
    const profilesToShow = createdProfiles.slice(-displayCount);
    
    profilesToShow.forEach(p => {
      const name = p.name.substring(0, 16).padEnd(16);
      const res = p.resolution.padEnd(12);
      const browser = p.browser.substring(0, 11).padEnd(11);
      const locale = p.locale.padEnd(6);
      const hw = p.hardware.padEnd(8);
      const date = formatDate(p.createdAt).padEnd(19);
      
      console.log(`│ ${name} │ ${res} │ ${browser} │ ${locale} │ ${hw} │ ${date} │`);
    });
    
    console.log('└──────────────────┴──────────────┴─────────────┴────────┴──────────┴─────────────────────┘');
    
    if (createdProfiles.length > 10) {
      console.log(`\n💡 Показаны последние 10 из ${createdProfiles.length} созданных профилей`);
    }
  }
  
  console.log('\n✅ Готово!\n');
}

// ========================================
// ИСПОЛЬЗОВАНИЕ
// ========================================

const args = process.argv.slice(2);
const count = args.length > 0 ? parseInt(args[0]) : 1;

if (isNaN(count) || count <= 0) {
  console.log('❌ Количество должно быть положительным числом!');
  console.log('Использование: node create-multiple-profiles.js [количество]');
  console.log('Примеры:');
  console.log('  node create-multiple-profiles.js       # Создаст 1 профиль');
  console.log('  node create-multiple-profiles.js 10    # Создаст 10 профилей');
  process.exit(1);
}

await createMultipleProfiles(count);