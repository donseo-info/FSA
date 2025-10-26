import { PFSerfer } from './pf-serfer.js';

// Функция для человеческого ввода текста
async function humanTypeText(page, text) {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Случайная задержка между символами (50-150ms)
    const delay = Math.random() * 100 + 50;
    await page.keyboard.type(char);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Иногда делаем паузу (как будто думаем)
    if (Math.random() < 0.1) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200));
    }
  }
}

async function smartYaSearch(baseQuery = 'купить квартиру', targetDomain = 'cian.ru', additionalWords = ['циан'], regionLr = 77) {
  const serfer = new PFSerfer('bot-479951176', {
    blockRulesFile: 'configs/yandex-block.txt',
    allowRulesFile: 'configs/yandex-block-razreshit.txt',
    humanlikeMode: true, // ВКЛЮЧАЕМ ЭМУЛЯЦИИ
    realisticCursor: true, // Включаем эмуляции мыши
    realisticScroll: true, // Включаем эмуляции скролла
    enableAutoSolve: true, // Включаем капчу
    bannerHandler: true, // Включаем баннеры
    regionLr
  });
  
  try {
    const browser = await serfer.start();
    
  // Получаем разрешение профиля из метаданных
  const ProfileManager = (await import('./ProfileManager.js')).default;
  const profileManager = new ProfileManager();
  const metadata = profileManager.loadMetadata();
  const profileConfig = metadata.profiles['bot-479951176'];
  
  if (!profileConfig || !profileConfig.resolution) {
    console.log('⚠️ Не удалось получить разрешение профиля, используем стандартное 1920x1080');
    var profileWidth = 1920;
    var profileHeight = 1080;
  } else {
    var profileWidth = profileConfig.resolution.width;
    var profileHeight = profileConfig.resolution.height;
  }
  
  console.log(`📐 Разрешение профиля: ${profileWidth}x${profileHeight}`);
  
  // Устанавливаем viewport ДО открытия вкладки через addInitScript
  console.log('📐 Устанавливаем viewport через addInitScript...');
  await browser.page.addInitScript((width, height) => {
    // Устанавливаем viewport сразу при загрузке страницы
    if (window.screen) {
      window.screen.width = width;
      window.screen.height = height;
    }
    // Также устанавливаем через CSS viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', `width=${width}, height=${height}, initial-scale=1`);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = `width=${width}, height=${height}, initial-scale=1`;
      document.head.appendChild(meta);
    }
  }, profileWidth, profileHeight);
    
    // Перехватываем клики по ссылкам, чтобы они открывались в той же вкладке
    console.log('🔧 Настраиваем перехват кликов по ссылкам...');
    await browser.page.addInitScript(() => {
      // Перехватываем все клики по ссылкам
      document.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link && link.target === '_blank') {
          console.log('🔗 Перехвачен клик по ссылке с target="_blank"');
          // Убираем target="_blank" чтобы ссылка открылась в той же вкладке
          link.removeAttribute('target');
        }
      }, true);
    });
    
    // Устанавливаем куку yandex_gid с нужным регионом
    console.log(`🍪 Устанавливаем куку yandex_gid=${regionLr} для ya.ru...`);
    await browser.context.addCookies([
      { name: 'yandex_gid', value: regionLr.toString(), domain: '.ya.ru', path: '/', httpOnly: false, secure: true, sameSite: 'None' }
    ]);
    console.log(`✅ Кука yandex_gid=${regionLr} установлена для .ya.ru`);
    
    console.log('🌐 Переходим на ya.ru...');
    await browser.page.goto('https://ya.ru', { waitUntil: 'domcontentloaded' });
    
    // Дополнительно устанавливаем viewport через Playwright API
    console.log('📐 Дополнительно устанавливаем viewport через Playwright...');
    await browser.page.setViewportSize({ width: profileWidth, height: profileHeight });
    
    // Проверяем, что viewport применился
    const viewport = await browser.page.viewportSize();
    console.log('✅ Viewport после перехода:', viewport);
    
    // Ждем полной загрузки страницы
    await browser.page.waitForLoadState('networkidle');
    console.log('✅ Страница ya.ru полностью загружена');
    
    console.log(`🔍 Начинаем умный поиск для домена: ${targetDomain}`);
    console.log(`📝 Базовый запрос: "${baseQuery}"`);
    
    // Первый поиск с базовым запросом
    console.log('🔍 Выполняем первый поиск...');
    let searchResult = await browser.searchOnYandex(baseQuery, targetDomain, 2); // До 2 страниц для поиска
    
    console.log('📊 Результат первого поиска:', searchResult);
    
    if (searchResult.domainClick && searchResult.domainClick.found) {
      console.log(`✅ Успешно найдена и открыта ссылка с доменом ${targetDomain}`);
      console.log('🔗 URL:', searchResult.domainClick.url);
      console.log('📝 Текст:', searchResult.domainClick.text);
      return searchResult;
    }
    
    // Если не найден, сразу пробуем с дополнительными словами
    console.log(`❌ Ссылка с доменом ${targetDomain} не найдена в первом поиске`);
    console.log('🔄 Сразу пробуем расширенный поиск...');
    
    for (let i = 0; i < additionalWords.length; i++) {
      const additionalWord = additionalWords[i];
      const expandedQuery = `${baseQuery} ${additionalWord}`;
      
      console.log(`🔍 Попытка ${i + 1}: "${expandedQuery}"`);
      
      // Работаем в уже открытой вкладке с результатами поиска
      console.log(`🔍 Ищем поле поиска в открытой вкладке с результатами поиска...`);
      
      // Получаем текущую страницу (страницу результатов)
      const pages = await browser.context.pages();
      console.log(`🔍 Всего вкладок: ${pages.length}`);
      for (let i = 0; i < pages.length; i++) {
        const url = await pages[i].url();
        console.log(`  Вкладка ${i}: ${url}`);
      }
      const currentPage = pages[pages.length - 1]; // Последняя открытая вкладка (результаты поиска)
      
      console.log(`📍 Работаем с активной вкладкой: ${await currentPage.url()}`);
      
      // Ищем поле поиска на странице результатов ya.ru
      const searchSelectors = [
        'input.search3__input.mini-suggest__input[name="text"]',
        'input.search3__input.mini-suggest__input',
        'input.mini-suggest__input[name="text"]',
        'input[name="text"][aria-label="Запрос"]',
        'input[name="text"]',
        'input[aria-label="Запрос"]',
        'input#text'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          const element = currentPage.locator(selector).first();
          const count = await element.count();
          if (count > 0) {
            const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
            if (isVisible) {
              searchInput = element;
              console.log(`✅ Найдено поле поиска: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Продолжаем поиск
        }
      }
      
      if (searchInput) {
        console.log(`🔍 Вводим новый запрос: "${expandedQuery}"`);
        
        // Кликаем по полю поиска
        await searchInput.click({ force: true });
        await browser.randomDelay(200, 400);
        
        // Очищаем поле (Ctrl+A, Delete)
        await currentPage.keyboard.press('Control+a');
        await browser.randomDelay(100, 200);
        await currentPage.keyboard.press('Delete');
        await browser.randomDelay(300, 500);
        
        // Вводим новый запрос по-человечески
        console.log('👤 Имитируем человеческий ввод...');
        await humanTypeText(currentPage, expandedQuery);
        await browser.randomDelay(500, 800);
        
        // Нажимаем Enter
        await currentPage.keyboard.press('Enter');
        
        // Ждем загрузки результатов
        await currentPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
        await browser.randomDelay(2000, 3000);
        
        console.log(`✅ Новый поиск "${expandedQuery}" выполнен успешно`);
        
        // Ищем домен на обновленной странице (ТЕКУЩАЯ вкладка, не первая!)
        console.log(`🔍 Ищем домен ${targetDomain} на обновленной странице...`);
        console.log(`🔍 targetDomain type: ${typeof targetDomain}, value: ${targetDomain}`);
        console.log(`🔍 currentPage URL перед вызовом: ${await currentPage.url()}`);
        console.log(`🔍 currentPage type: ${typeof currentPage}, constructor: ${currentPage.constructor.name}`);
        console.log(`🔍 browser.findAndClickDomainLink type: ${typeof browser.findAndClickDomainLink}`);
        console.log(`🔍 browser keys: ${Object.keys(browser).join(', ')}`);
        const clickResult = await browser.findAndClickDomainLink(currentPage, targetDomain, 1); // Только на текущей странице
        searchResult = { success: true, query: expandedQuery, domainClick: clickResult };
        
      } else {
        console.log(`⚠️ Поле поиска не найдено, делаем новый поиск...`);
        searchResult = await browser.searchOnYandex(expandedQuery, targetDomain, 1); // Только на текущей странице
      }
      
      console.log(`📊 Результат поиска "${expandedQuery}":`, searchResult);
      
      if (searchResult.domainClick && searchResult.domainClick.found) {
        console.log(`✅ Успешно найдена ссылка с доменом ${targetDomain} в расширенном поиске!`);
        console.log(`🔗 URL: ${searchResult.domainClick.url}`);
        console.log(`📝 Текст: ${searchResult.domainClick.text}`);
        console.log(`🎯 Найден с запросом: "${expandedQuery}"`);
        return searchResult;
      }
      
      console.log(`❌ Не найдено с запросом "${expandedQuery}"`);
    }
    
    console.log(`❌ Ссылка с доменом ${targetDomain} не найдена ни в одном поиске`);
    console.log('📋 Попробованы запросы:');
    console.log(`  1. "${baseQuery}"`);
    additionalWords.forEach((word, i) => {
      console.log(`  ${i + 2}. "${baseQuery} ${word}"`);
    });
    
    return { success: false, message: 'Домен не найден ни в одном поиске' };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return { success: false, error: error.message };
  }
}

// Проверяем, запущен ли файл напрямую
if (import.meta.url.endsWith('ya-pf.js') || process.argv[1].endsWith('ya-pf.js')) {
  console.log('🔍 Проверяем условия запуска...');
  console.log('process.argv[1]:', process.argv[1]);
  console.log('import.meta.url:', import.meta.url);
  
  // Захардкоженные параметры для тестирования (избегаем проблем с кодировкой командной строки)
  const baseQuery = 'купить квартиру';
  const targetDomain = 'cian.ru';
  const additionalWords = ['циан'];
  const regionLr = 77;
  
  console.log(`🚀 Запуск поиска:`);
  console.log(`   📝 Базовый запрос: "${baseQuery}"`);
  console.log(`   🎯 Целевой домен: "${targetDomain}"`);
  console.log(`   🔍 Дополнительные слова: [${additionalWords.join(', ')}]`);
  console.log(`   📍 Регион LR: ${regionLr}`);
  
  smartYaSearch(baseQuery, targetDomain, additionalWords, regionLr)
    .then(result => {
      console.log('🎉 Результат поиска:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

export { smartYaSearch };
