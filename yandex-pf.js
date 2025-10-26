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

async function smartYandexSearch(baseQuery = 'отказное письмо как получить', targetDomain = 'alfagost.ru', additionalWords = ['альфагост'], regionLr = '213', profileName = 'bot-332092780') {
  const serfer = new PFSerfer(profileName, {
    blockRulesFile: 'configs/yandex-block.txt',
    allowRulesFile: 'configs/yandex-block-razreshit.txt',
    humanlikeMode: true, // ВКЛЮЧАЕМ ЭМУЛЯЦИИ
    realisticCursor: true, // Включаем эмуляции мыши
    realisticScroll: true, // Включаем эмуляции скролла
    enableAutoSolve: true, // Включаем капчу
    bannerHandler: true, // Включаем баннеры
    regionLr: regionLr // Передаем параметр региона
  });
  
  try {
    const browser = await serfer.start();
    
    // Получаем разрешение профиля из метаданных
    const ProfileManager = (await import('./ProfileManager.js')).default;
    const profileManager = new ProfileManager();
    const metadata = profileManager.loadMetadata();
    const profileConfig = metadata.profiles[profileName];
    
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
    
    // Устанавливаем куки региона для dzen.ru и yandex.ru на основе анализа
    try {
      // Устанавливаем куки для dzen.ru
      await browser.context.addCookies([
        { name: 'ask_city', value: '+', domain: 'dzen.ru', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
        { name: 'zen_gid', value: regionLr, domain: '.dzen.ru', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
        //{ name: 'zen_vk_gid', value: '5506', domain: '.dzen.ru', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' }
      ]);
      console.log(`🍪 Куки для dzen.ru установлены: ask_city=+, zen_gid=${regionLr}, zen_vk_gid=5506`);
      
      // Устанавливаем куки для yandex.ru на основе анализа теста
      await browser.context.addCookies([
        { name: 'yandex_gid', value: regionLr, domain: '.yandex.ru', path: '/', httpOnly: false, secure: true, sameSite: 'None' },
        { name: 'yandex_gid', value: regionLr, domain: '.ya.ru', path: '/', httpOnly: false, secure: true, sameSite: 'None' },
        { name: 'my', value: 'YysBgNUA', domain: '.yandex.ru', path: '/', httpOnly: false, secure: true, sameSite: 'None' },
        { name: 'my', value: 'YysBgNUA', domain: '.ya.ru', path: '/', httpOnly: false, secure: true, sameSite: 'None' }
      ]);
      console.log(`🍪 Куки для yandex.ru установлены: yandex_gid=${regionLr}, my=YysBgNUA`);
      
           // Перехватываем редиректы и исправляем lr в URL на уровне контекста
           try {
             // Устанавливаем перехват на уровне контекста браузера
             await browser.context.route('**/*', async (route) => {
               const request = route.request();
               const url = request.url();
               
               console.log(`🔍 Перехвачен запрос: ${url}`);
               
               // Перехватываем переходы с Dzen на Yandex
               if (url.includes('yandex.ru/search') && url.includes('search_source=dzen_desktop_safe')) {
                 if (!url.includes('lr=')) {
                   // Добавляем lr параметр если его нет
                   const newUrl = url + `&lr=${regionLr}`;
                   console.log(`🔄 Перехватываем route с Dzen: ${url} -> ${newUrl}`);
                   await route.continue({ url: newUrl });
                   return;
                 } else if (!url.includes(`lr=${regionLr}`)) {
                   // Заменяем lr параметр если он неправильный
                   const newUrl = url.replace(/lr=\d+/, `lr=${regionLr}`);
                   console.log(`🔄 Перехватываем route с Dzen: ${url} -> ${newUrl}`);
                   await route.continue({ url: newUrl });
                   return;
                 }
               }
               // Перехватываем обычные поиски Яндекса
               else if (url.includes('yandex.ru/search') && url.includes('lr=') && !url.includes(`lr=${regionLr}`)) {
                 const newUrl = url.replace(/lr=\d+/, `lr=${regionLr}`);
                 console.log(`🔄 Перехватываем route: ${url} -> ${newUrl}`);
                 await route.continue({ url: newUrl });
                 return;
               }
               
               // Продолжаем обычный запрос
               await route.continue();
             });
             
             console.log(`✅ Перехват route установлен на уровне контекста браузера`);
           } catch (error) {
             console.log(`⚠️ Ошибка установки перехвата route: ${error.message}`);
           }
    } catch (_) {}
    
    console.log('🌐 Переходим на yandex.ru...');
    await browser.navigateToPage('https://yandex.ru');
    
    // Проверяем, что viewport применился
    const viewport = await browser.page.viewportSize();
    console.log('✅ Viewport после перехода:', viewport);
    
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
      console.log('🎯 Задача выполнена успешно! Закрываем браузер...');
      await browser.close();
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
        console.log('🎯 Задача выполнена успешно! Закрываем браузер...');
        await browser.close();
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
    
    console.log('🔄 Закрываем браузер...');
    await browser.close();
    return { success: false, message: 'Домен не найден ни в одном поиске' };
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    try {
      await browser.close();
    } catch (e) {
      console.log('⚠️ Ошибка при закрытии браузера:', e.message);
    }
    return { success: false, error: error.message };
  }
}

// Захардкоженные параметры для тестирования (избегаем проблем с кодировкой командной строки)
const baseQuery = 'отказное письмо как получить';
const targetDomain = 'alfagost.ru';
const additionalWords = ['альфагост'];
const regionLr = '213';
const profileName = 'bot-332092780';

console.log(`🚀 Запуск поиска:`);
console.log(`📝 Базовый запрос: "${baseQuery}"`);
console.log(`🎯 Целевой домен: ${targetDomain}`);
console.log(`🔍 Дополнительные слова: ${additionalWords.join(', ')}`);
console.log(`🌍 Регион (lr): ${regionLr}`);
console.log(`👤 Профиль: ${profileName}`);

// Запускаем поиск с захардкоженными параметрами
smartYandexSearch(baseQuery, targetDomain, additionalWords, regionLr, profileName);
