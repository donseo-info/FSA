import { PFSerfer } from './pf-serfer.js';

async function testBannerClose() {
  console.log('🔍 Тестируем закрытие баннера в открытом браузере...');
  
  try {
    // Подключаемся к уже открытому браузеру
    const serfer = new PFSerfer('bot-479951176', {
      blockRulesFile: 'configs/yandex-block.txt',
      allowRulesFile: 'configs/yandex-block-razreshit.txt'
    });
    
    // Подключаемся к существующему браузеру
    const browser = await serfer.connectToExistingBrowser();
    
    if (!browser) {
      console.log('❌ Не удалось подключиться к браузеру. Убедитесь, что браузер запущен.');
      return;
    }
    
    console.log('✅ Подключились к браузеру');
    
    // Получаем активную страницу
    const pages = await browser.contexts()[0].pages();
    const page = pages[0];
    
    console.log('📄 Работаем с активной страницей:', await page.url());
    
    // Проверяем и закрываем баннеры
    console.log('🎯 Проверяем баннеры на странице...');
    const result = await serfer.handleBannersAfterNavigation();
    
    console.log('📊 Результат:', result);
    
    if (result.closed > 0) {
      console.log('✅ Баннеры успешно закрыты!');
    } else {
      console.log('ℹ️ Баннеры не найдены или уже закрыты');
    }
    
    // Ждем немного, чтобы увидеть результат
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Тест завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testBannerClose();
