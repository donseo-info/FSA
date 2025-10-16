import { ProfileGenerator } from './managers/ProfileGenerator.js';
import { generateRandomId, formatDate } from './utils/helpers.js';
import fs from 'fs';
import path from 'path';

/**
 * Сканирует папку F:\Browser и возвращает массив доступных версий Chrome
 */
function scanBrowserVersions() {
  const browserDir = 'F:\\Browser';
  const chromePaths = [];
  
  try {
    if (!fs.existsSync(browserDir)) {
      console.log('⚠️ Папка F:\\Browser не найдена, используем стандартные пути');
      return [
        {
          path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          versions: ['141.0.7390.66']
        }
      ];
    }
    
    const folders = fs.readdirSync(browserDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`🔍 Найдено ${folders.length} версий браузера в F:\\Browser`);
    
    folders.forEach(folder => {
      const chromePath = path.join(browserDir, folder, 'App', 'Chrome-bin', 'chrome.exe');
      
      if (fs.existsSync(chromePath)) {
        // Извлекаем версию из имени папки (например, "141-66" -> "141.0.0.66")
        const versionMatch = folder.match(/^(\d+)-(\d+)$/);
        if (versionMatch) {
          const majorVersion = versionMatch[1];
          const buildVersion = versionMatch[2];
          const fullVersion = `${majorVersion}.0.0.${buildVersion}`;
          
          chromePaths.push({
            path: chromePath,
            versions: [fullVersion],
            folder: folder
          });
          
          console.log(`  ✅ ${folder} -> ${fullVersion}`);
        } else {
          console.log(`  ⚠️ Неизвестный формат папки: ${folder}`);
        }
      } else {
        console.log(`  ❌ Chrome не найден в папке: ${folder}`);
      }
    });
    
    // Добавляем стандартный Chrome, если он установлен
    const standardChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (fs.existsSync(standardChrome)) {
      chromePaths.push({
        path: standardChrome,
        versions: ['141.0.7390.66'],
        folder: 'Standard'
      });
      console.log(`  ✅ Standard Chrome -> 141.0.7390.66`);
    }
    
    if (chromePaths.length === 0) {
      console.log('❌ Не найдено ни одной версии Chrome!');
      return [
        {
          path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          versions: ['141.0.7390.66']
        }
      ];
    }
    
    console.log(`\n📊 Итого найдено ${chromePaths.length} версий Chrome\n`);
    return chromePaths;
    
  } catch (error) {
    console.error('❌ Ошибка при сканировании папки браузеров:', error.message);
    return [
      {
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        versions: ['141.0.7390.66']
      }
    ];
  }
}

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
  console.log('🔍 Сканирование доступных версий браузера...\n');
  
  // Автоматически находим все версии Chrome
  const chromePaths = scanBrowserVersions();
  
  const generator = new ProfileGenerator({
    resolutions: [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 2560, height: 1440 },
      { width: 1680, height: 1050 },
      { width: 1600, height: 900 },
      { width: 1280, height: 720 },
      { width: 1536, height: 864 },
      { width: 1280, height: 1200 }
    ],
    chromePaths: chromePaths
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