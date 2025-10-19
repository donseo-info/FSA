import { PFSerfer } from './pf-serfer.js';

async function testBannerFix() {
  const serfer = new PFSerfer('bot-373476829', {
    blockRulesFile: 'configs/yandex-block.txt',
    allowRulesFile: 'configs/yandex-block-razreshit.txt'
  });
  
  try {
    const browser = await serfer.start();
    
    console.log('🌐 Переходим на yandex.ru...');
    await browser.navigateToPage('https://yandex.ru');
    
    console.log('🔍 Выполняем поиск...');
    const searchResult = await browser.searchOnYandex('взять кредит под залог автомобиля', 'sberbank.ru', 2); // Ищем только на 1 странице
    
    console.log('📊 Результат поиска:', searchResult);
    
    if (searchResult.domainClick && searchResult.domainClick.found) {
      console.log('✅ Успешно найдена и открыта ссылка с доменом sberbank.ru');
      console.log('🔗 URL:', searchResult.domainClick.url);
      console.log('📝 Текст:', searchResult.domainClick.text);
    } else {
      console.log('❌ Ссылка с доменом sberbank.ru не найдена');
    }
    
    console.log('✅ Тест завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testBannerFix();
