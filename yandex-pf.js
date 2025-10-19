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

async function smartYandexSearch(baseQuery = 'взять кредит под залог автомобиля', targetDomain = 'sberbank.ru', additionalWords = ['sberbank', 'сбербанк', 'банк']) {
  const serfer = new PFSerfer('bot-373476829', {
    blockRulesFile: 'configs/yandex-block.txt',
    allowRulesFile: 'configs/yandex-block-razreshit.txt',
    humanlikeMode: true, // ВКЛЮЧАЕМ ЭМУЛЯЦИИ
    realisticCursor: true, // Включаем эмуляции мыши
    realisticScroll: true, // Включаем эмуляции скролла
    captchaSolver: true, // Включаем капчу
    bannerHandler: true // Включаем баннеры
  });
  
  try {
    const browser = await serfer.start();
    
    console.log('🌐 Переходим на yandex.ru...');
    await browser.navigateToPage('https://yandex.ru');
    
    console.log(`🔍 Начинаем умный поиск для домена: ${targetDomain}`);
    console.log(`📝 Базовый запрос: "${baseQuery}"`);
    
    // Первый поиск с базовым запросом
    console.log('🔍 Выполняем первый поиск...');
    let searchResult = await browser.searchOnYandex(baseQuery, targetDomain, 2);
    
    console.log('📊 Результат первого поиска:', searchResult);
    
    if (searchResult.domainClick && searchResult.domainClick.found) {
      console.log('✅ Успешно найдена и открыта ссылка с доменом sberbank.ru');
      console.log('🔗 URL:', searchResult.domainClick.url);
      console.log('📝 Текст:', searchResult.domainClick.text);
      return searchResult;
    }
    
    // Если не найден, пробуем с дополнительными словами
    console.log('❌ Ссылка с доменом sberbank.ru не найдена в первом поиске');
    console.log('🔄 Пробуем расширенный поиск...');
    
    for (let i = 0; i < additionalWords.length; i++) {
      const additionalWord = additionalWords[i];
      const expandedQuery = `${baseQuery} ${additionalWord}`;
      
      console.log(`🔍 Попытка ${i + 1}: "${expandedQuery}"`);
      
      // Работаем в уже открытой вкладке с результатами поиска Яндекса
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
      
      // Ищем поле поиска на странице результатов
      const searchSelectors = [
        'textarea.HeaderForm-Input.mini-suggest__input.beauty-scroll',
        'textarea[role="combobox"]',
        'textarea.mini-suggest__input',
        'textarea.HeaderForm-Input',
        'input.HeaderForm-Input.beauty-scroll.mini-suggest__control[name="text"]',
        'input.HeaderForm-Input.beauty-scroll.mini-suggest__control',
        'input[name="text"][aria-label="Запрос"]',
        'input[name="text"]',
        'input[aria-label="Запрос"]'
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
        const clickResult = await browser.findAndClickDomainLink(currentPage, targetDomain, 1);
        searchResult = { success: true, query: expandedQuery, domainClick: clickResult };
        
      } else {
        console.log(`⚠️ Поле поиска не найдено, делаем новый поиск...`);
        searchResult = await browser.searchOnYandex(expandedQuery, targetDomain, 1);
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
    
    console.log('❌ Ссылка с доменом sberbank.ru не найдена ни в одном поиске');
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

// Примеры использования:

// 1. Поиск Сбербанка с кредитами
smartYandexSearch('взять кредит под залог автомобиля', 'sberbank.ru', ['sberbank', 'сбербанк', 'банк']);

// 2. Поиск другого банка (раскомментируйте нужный)
// smartYandexSearch('взять кредит под залог автомобиля', 'gazprombank.ru', ['gazprombank', 'газпромбанк', 'банк']);
// smartYandexSearch('взять кредит под залог автомобиля', 'vtb.ru', ['vtb', 'втб', 'банк']);
// smartYandexSearch('взять кредит под залог автомобиля', 'alfabank.ru', ['alfabank', 'альфабанк', 'банк']);
