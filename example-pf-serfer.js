import { PFSerfer } from './pf-serfer.js';

/**
 * Пример использования PF-Serfer для человекоподобной работы с браузером
 */
(async () => {
  console.log('🚀 Запуск примера PF-Serfer...\n');
  
  // Создаем экземпляр PF-Serfer
  const pfSerfer = new PFSerfer('bot-123456789', {
    // Настройки человекоподобности
    enableIdleJitter: true,           // Фоновое дрожание курсора
    enableNervousMovements: true,     // Нервные движения
    enableReadingSimulation: true,    // Имитация чтения
    enableRandomExploration: true,    // Случайные движения
    thinkingTimeMin: 500,             // Минимальное время "думания"
    thinkingTimeMax: 2000,            // Максимальное время "думания"
    movementSpeed: 'medium',          // Скорость движений
    
    // Настройки капчи
    enableAutoSolve: true,            // Автоматическое решение капчи
    captchaApiKey: 'b7bfc10970a2467492f55e1f74d0d800',
    
    // Другие настройки
    useProxy: false,                  // Использовать прокси
    enablePlugins: true,              // Включить плагины
    enableResourceBlocking: true      // Блокировать ресурсы
  });
  
  let browser = null;
  
  try {
    // Запускаем PF-Serfer
    browser = await pfSerfer.start();
    
    console.log('\n🎯 PF-Serfer готов к работе!');
    console.log('📋 Доступные методы:');
    console.log('   - browser.navigateToPage(url, options)');
    console.log('   - browser.humanClick(selector, options)');
    console.log('   - browser.humanScroll(direction, amount)');
    console.log('   - browser.simulateReading(selector, duration)');
    console.log('   - browser.explorePage(count)');
    console.log('   - browser.nervousWait(condition, maxDuration)');
    console.log('   - browser.handleCaptcha()');
    console.log('   - browser.randomDelay(min, max)');
    console.log('   - browser.thinkingTime()');
    console.log('   - browser.getStats()');
    console.log('   - browser.close()\n');
    
    // Пример 1: Переход на Яндекс
    console.log('━━━ ПРИМЕР 1: Переход на Яндекс ━━━');
    await browser.navigateToPage('https://ya.ru', {
      exploreAfterLoad: true,
      readTitle: true,
      scrollAfterLoad: true
    });
    
    // Изучаем страницу
    await browser.explorePage(3);
    
    // Время на обдумывание
    await browser.thinkingTime();
    
    // Кликаем по полю поиска
    await browser.humanClick('input[name="text"]', {
      thinking: true,
      speed: 'medium'
    });
    
    // Вводим текст
    await browser.page.keyboard.type('пример поиска', { delay: 150 });
    
    // Время на обдумывание перед отправкой
    await browser.thinkingTime();
    
    // Нажимаем Enter
    await browser.page.keyboard.press('Enter');
    
    // Ждем загрузки результатов
    await browser.page.waitForTimeout(3000);
    
    // Прокручиваем результаты
    await browser.humanScroll('down', 500);
    
    console.log('✅ Пример 1 завершен\n');
    
    // Пример 2: Работа с капчей (если появится)
    console.log('━━━ ПРИМЕР 2: Обработка капчи ━━━');
    
    // Проверяем, есть ли капча
    const hasCaptcha = await browser.page.url().includes('showcaptcha');
    if (hasCaptcha) {
      console.log('🔐 Обнаружена капча, запускаем автоматическое решение...');
      const captchaSolved = await browser.handleCaptcha();
      
      if (captchaSolved) {
        console.log('✅ Капча решена автоматически!');
      } else {
        console.log('❌ Не удалось решить капчу автоматически');
      }
    } else {
      console.log('✅ Капча не обнаружена');
    }
    
    console.log('✅ Пример 2 завершен\n');
    
    // Пример 3: Имитация чтения
    console.log('━━━ ПРИМЕР 3: Имитация чтения ━━━');
    
    // Ищем заголовки для чтения
    const headings = await browser.page.locator('h1, h2, h3').all();
    if (headings.length > 0) {
      const randomHeading = headings[Math.floor(Math.random() * headings.length)];
      const headingText = await randomHeading.textContent();
      
      if (headingText && headingText.trim()) {
        console.log(`📖 Читаем заголовок: "${headingText.trim()}"`);
        await browser.simulateReading('h1, h2, h3', 3000);
      }
    }
    
    console.log('✅ Пример 3 завершен\n');
    
    // Пример 4: Нервное ожидание
    console.log('━━━ ПРИМЕР 4: Нервное ожидание ━━━');
    
    // Имитируем ожидание загрузки элемента
    await browser.nervousWait(
      async () => {
        // Проверяем, есть ли элементы на странице
        const elements = await browser.page.locator('body').count();
        return elements > 0;
      },
      5000
    );
    
    console.log('✅ Пример 4 завершен\n');
    
    // Показываем статистику
    console.log('━━━ СТАТИСТИКА РАБОТЫ ━━━');
    const stats = browser.getStats();
    console.log(`📊 Статистика:`);
    console.log(`   🌐 Страниц посещено: ${stats.pagesVisited}`);
    console.log(`   👆 Кликов выполнено: ${stats.clicksPerformed}`);
    console.log(`   📜 Прокруток выполнено: ${stats.scrollsPerformed}`);
    console.log(`   🔐 Капч решено: ${stats.captchasSolved}`);
    console.log(`   ❌ Капч не решено: ${stats.captchasFailed}`);
    
    const duration = Math.round((Date.now() - stats.startTime) / 1000);
    console.log(`   ⏱️ Время работы: ${duration} секунд\n`);
    
    // Оставляем браузер открытым для демонстрации
    console.log('💡 Браузер оставлен открытым для демонстрации');
    console.log('💡 Вы можете продолжить работу с ним вручную');
    console.log('💡 Или вызвать browser.close() для завершения работы\n');
    
    // Раскомментируйте следующую строку для автоматического закрытия
    // await browser.close();
    
  } catch (error) {
    console.error('\n❌ Ошибка в примере:', error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('⚠️ Ошибка закрытия браузера:', closeError.message);
      }
    }
    
    process.exit(1);
  }
})();


