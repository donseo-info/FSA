import { PFSerfer } from './pf-serfer.js';

async function testDomainClick() {
  const serfer = new PFSerfer('bot-373476829', {
    blockRulesFile: 'configs/yandex-block.txt',
    allowRulesFile: 'configs/yandex-block-razreshit.txt'
  });
  
  try {
    const browser = await serfer.start();
    
    console.log('🌐 Переходим на yandex.ru...');
    await browser.navigateToPage('https://yandex.ru');
    
         console.log('🔍 Выполняем поиск с поиском домена academy.lamoda.ru...');
         const searchResult = await browser.searchOnYandex('как оформить отказное письмо', 'academy.lamoda.ru');
    
    console.log('📊 Результат поиска:', searchResult);
    
    if (searchResult.domainClick && searchResult.domainClick.found) {
      console.log('✅ Успешно найдена и открыта ссылка с доменом academy.lamoda.ru');
      console.log('🔗 URL:', searchResult.domainClick.url);
      console.log('📝 Текст:', searchResult.domainClick.text);
    } else {
      console.log('❌ Ссылка с доменом academy.lamoda.ru не найдена');
      console.log('📋 Получаем все ссылки...');
      const links = await browser.getSearchResults();
      console.log('📋 Найдено ссылок:', links.length);
      
      // Показываем первые 5 ссылок
      links.slice(0, 5).forEach((link, index) => {
        console.log(`${index + 1}. ${link.url}`);
        if (link.text) {
          console.log(`   Текст: ${link.text.substring(0, 60)}...`);
        }
      });
    }
    
    console.log('✅ Тест завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testDomainClick();
