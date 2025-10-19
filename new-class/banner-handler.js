/**
 * Обработчик баннеров и модальных окон
 * Автоматически закрывает различные всплывающие элементы
 */
export class BannerHandler {
  constructor(page, cursor) {
    this.page = page;
    this.cursor = cursor;
    
    // Проверяем, что page передан
    if (!this.page) {
      throw new Error('BannerHandler требует объект page');
    }
    
    // Массив селекторов для различных баннеров и модальных окон
    this.bannerSelectors = [
      // Яндекс баннеры
      '.Distribution-ButtonClose',
      '.Distribution-SplashScreenModalCloseButtonBeside',
      '.Distribution-SplashScreenModalContent',
      '.Distribution-SplashScreenModalCloseButton',
      '.Distribution-Button',
      '.Distribution-Button_view_cross',
      '[aria-label="Нет, спасибо"]',
      '[aria-label*="Нет, спасибо"]',
      '[title="Нет, спасибо"]',
      '.Modal-Close',
      '.Popup-Close',
      
      // Google баннеры
      '.gb_3d', // Кнопка закрытия Google баннеров
      '.gb_3e', // Альтернативная кнопка закрытия
      '[aria-label="Закрыть"]',
      '.close-button',
      
      // Дзен баннеры
      'span[aria-label="Закрыть"]', // Специфичный селектор для Дзен баннеров
      'span[aria-label="Закрыть"] svg', // SVG внутри кнопки закрытия
      'span[aria-label="Закрыть"][tabindex="0"]', // Кнопка закрытия с tabindex
      'span[aria-label="Закрыть"][tabindex="0"] svg', // SVG внутри кнопки с tabindex
      
      // Общие селекторы
      '.close',
      '.close-btn',
      '.modal-close',
      '.popup-close',
      '.banner-close',
      '.ad-close',
      '.cookie-close',
      '.notification-close',
      
      // Селекторы по атрибутам
      '[aria-label*="закрыть" i]',
      '[aria-label*="close" i]',
      '[aria-label*="нет" i]',
      '[aria-label*="отмена" i]',
      '[title*="закрыть" i]',
      '[title*="close" i]',
      
      // Селекторы по тексту
      'button:has-text("×")',
      'button:has-text("✕")',
      'button:has-text("Закрыть")',
      'button:has-text("Close")',
      'button:has-text("Нет, спасибо")',
      'button:has-text("Отмена")',
      'button:has-text("Cancel")',
      
      // iframe баннеры
      'iframe[src*="ads"] + .close',
      'iframe[src*="banner"] + .close',
      
      // Cookie баннеры
      '.cookie-banner .close',
      '.cookie-notice .close',
      '.gdpr-banner .close',
      '#cookie-close',
      '#accept-cookies',
      '.cookie-accept',
      
      // Уведомления
      '.notification .close',
      '.alert .close',
      '.toast .close',
      '.snackbar .close'
    ];
    
    // Селекторы для проверки видимости баннеров
    this.bannerContainerSelectors = [
      '.modal',
      '.popup',
      '.banner',
      '.notification',
      '.toast',
      '.snackbar',
      '.cookie-banner',
      '.gdpr-banner',
      '.ad-banner',
      '.splash-screen',
      '.overlay',
      '.backdrop'
    ];
  }

  /**
   * Проверяет наличие баннеров на странице
   */
  async checkForBanners() {
    try {
      const visibleBanners = [];
      
      // Проверяем контейнеры баннеров
      for (const selector of this.bannerContainerSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          for (const element of elements) {
            if (await element.isVisible({ timeout: 1000 })) {
              visibleBanners.push({
                type: 'container',
                selector: selector,
                element: element
              });
            }
          }
        } catch (e) {
          // Игнорируем ошибки поиска элементов
        }
      }
      
      return visibleBanners;
    } catch (error) {
      console.error('Ошибка проверки баннеров:', error.message);
      return [];
    }
  }

  /**
   * Проверяет, видим ли баннер на странице
   */
  async isBannerVisible(closeButton) {
    try {
      // Ищем родительский баннер
      const bannerSelectors = [
        '.Distribution-SplashScreenModal',
        '.Distribution-SplashScreenModalContent',
        '.modal',
        '.popup',
        '.banner'
      ];
      
      for (const bannerSelector of bannerSelectors) {
        try {
          // Ищем баннер, который содержит нашу кнопку закрытия
          const banner = this.page.locator(bannerSelector).filter({ has: closeButton });
          if (await banner.isVisible({ timeout: 500 })) {
            return true;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
      
      // Если не нашли родительский баннер, проверяем, что кнопка не скрыта
      const style = await closeButton.evaluate(el => {
        const computedStyle = window.getComputedStyle(el);
        return {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity
        };
      }).catch(() => null);
      
      if (style) {
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               parseFloat(style.opacity) > 0;
      }
      
      return true; // Если не можем проверить, считаем что видим
    } catch (error) {
      return true; // В случае ошибки считаем что видим
    }
  }

  /**
   * Проверяет, является ли элемент кнопкой закрытия
   */
  async isCloseButton(element, selector) {
    try {
      const text = await element.textContent().catch(() => '');
      const ariaLabel = await element.getAttribute('aria-label').catch(() => '');
      const title = await element.getAttribute('title').catch(() => '');
      
      const closeKeywords = ['закрыть', 'close', 'нет', 'no', 'отмена', 'cancel', 'dismiss', 'cross', 'спасибо'];
      const downloadKeywords = ['скачать', 'download', 'установить', 'install', 'браузер', 'browser', 'получить', 'get'];
      
      const allText = `${text} ${ariaLabel} ${title}`.toLowerCase();
      
      // Если есть ключевые слова скачивания - это НЕ кнопка закрытия
      if (downloadKeywords.some(keyword => allText.includes(keyword))) {
        return false;
      }
      
      // Если есть ключевые слова закрытия - это кнопка закрытия
      if (closeKeywords.some(keyword => allText.includes(keyword))) {
        return true;
      }
      
      // Если селектор содержит "close" или "cross" - это кнопка закрытия
      if (selector.includes('close') || selector.includes('cross')) {
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ищет кнопки закрытия баннеров
   */
  async findCloseButtons() {
    try {
      const closeButtons = [];
      
      // Сначала ищем кнопки закрытия с классом Distribution-ButtonClose
      const closeButtonSelectors = [
        '.Distribution-ButtonClose',
        '.Distribution-SplashScreenModalCloseButton',
        '.Distribution-SplashScreenModalCloseButtonBeside',
        'button[aria-label="Нет, спасибо"]',
        'button[aria-label*="Нет, спасибо"]',
        'button[title="Нет, спасибо"]',
        
        // Дзен баннеры - добавляем наши новые селекторы
        'span[aria-label="Закрыть"]',
        'span[aria-label="Закрыть"][tabindex="0"]',
        'span[aria-label="Закрыть"] svg',
        'span[aria-label="Закрыть"][tabindex="0"] svg'
      ];
      
      for (const selector of closeButtonSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          for (const element of elements) {
            if (await element.isVisible({ timeout: 1000 })) {
              // Проверяем, что родительский баннер тоже видим
              const isBannerVisible = await this.isBannerVisible(element);
              if (isBannerVisible) {
                closeButtons.push({
                  selector: selector,
                  element: element,
                  type: 'direct'
                });
              }
            }
          }
        } catch (e) {
          // Игнорируем ошибки поиска элементов
        }
      }
      
      // Затем ищем кнопки закрытия внутри контейнеров баннеров
      const containerSelectors = [
        '.Distribution-SplashScreenModalContent',
        '.modal-content',
        '.popup-content',
        '.banner-content',
        '.notification-content'
      ];
      
      for (const containerSelector of containerSelectors) {
        try {
          const containers = await this.page.locator(containerSelector).all();
          for (const container of containers) {
            if (await container.isVisible({ timeout: 1000 })) {
              // Ищем кнопки закрытия внутри контейнера
              const closeButtonSelectors = [
                'button[aria-label*="закрыть" i]',
                'button[aria-label*="close" i]',
                'button[aria-label*="нет" i]',
                'button[title*="закрыть" i]',
                'button[title*="close" i]',
                '.close',
                '.close-btn',
                '.modal-close',
                '.popup-close',
                'button:has-text("×")',
                'button:has-text("✕")',
                'button:has-text("Закрыть")',
                'button:has-text("Close")',
                'button:has-text("Нет, спасибо")'
              ];
              
              for (const closeSelector of closeButtonSelectors) {
                try {
                  const closeButton = container.locator(closeSelector).first();
                  if (await closeButton.isVisible({ timeout: 500 })) {
                    closeButtons.push({
                      selector: `${containerSelector} ${closeSelector}`,
                      element: closeButton,
                      type: 'container',
                      container: containerSelector
                    });
                    break; // Нашли кнопку в контейнере, переходим к следующему контейнеру
                  }
                } catch (e) {
                  // Игнорируем ошибки поиска
                }
              }
            }
          }
        } catch (e) {
          // Игнорируем ошибки поиска контейнеров
        }
      }
      
      return closeButtons;
    } catch (error) {
      console.error('Ошибка поиска кнопок закрытия:', error.message);
      return [];
    }
  }

  /**
   * Закрывает баннер с человекоподобным поведением
   */
  async closeBanner(closeButton) {
    try {
      // Проверяем, что элемент все еще видим
      if (!(await closeButton.element.isVisible({ timeout: 1000 }))) {
        console.log(`⚠️ Элемент уже не видим: ${closeButton.selector}`);
        return false;
      }

      // Получаем координаты кнопки
      const box = await closeButton.element.boundingBox();
      if (!box) {
        console.log(`⚠️ Не удалось получить координаты: ${closeButton.selector}`);
        return false;
      }

      console.log(`🎯 Кликаем по элементу: ${closeButton.selector}`);
      console.log(`📍 Координаты: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`);

      // Человекоподобное движение к кнопке
      await this.cursor.moveTo(closeButton.selector, 'medium');
      
      // Небольшая пауза перед кликом (как человек)
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      // Кликаем по кнопке
      await this.cursor.click(closeButton.selector);
      
      // Пауза после клика
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      // Проверяем, что элемент исчез
      const stillVisible = await closeButton.element.isVisible({ timeout: 1000 }).catch(() => false);
      if (!stillVisible) {
        console.log(`✅ Элемент успешно закрыт: ${closeButton.selector}`);
        return true;
      } else {
        console.log(`⚠️ Элемент все еще видим после клика: ${closeButton.selector}`);
        return false;
      }
      
    } catch (error) {
      console.error('Ошибка закрытия баннера:', error.message);
      return false;
    }
  }

  /**
   * Автоматически закрывает все найденные баннеры
   */
  async closeAllBanners() {
    try {
      console.log('🔍 Поиск баннеров и модальных окон...');
      
      const closeButtons = await this.findCloseButtons();
      
      if (closeButtons.length === 0) {
        console.log('✅ Баннеры не найдены');
        return { closed: 0, total: 0 };
      }
      
      console.log(`🎯 Найдено ${closeButtons.length} кнопок закрытия`);
      
      // Группируем по типам
      const directButtons = closeButtons.filter(b => b.type === 'direct');
      const containerButtons = closeButtons.filter(b => b.type === 'container');
      
      if (directButtons.length > 0) {
        console.log(`  📌 Прямые кнопки: ${directButtons.length}`);
      }
      if (containerButtons.length > 0) {
        console.log(`  📦 Кнопки в контейнерах: ${containerButtons.length}`);
      }
      
      let closedCount = 0;
      
      for (const closeButton of closeButtons) {
        try {
          const typeIcon = closeButton.type === 'direct' ? '📌' : '📦';
          console.log(`🖱️ ${typeIcon} Закрываем баннер: ${closeButton.selector}`);
          
          const success = await this.closeBanner(closeButton);
          if (success) {
            closedCount++;
            console.log(`✅ Баннер закрыт: ${closeButton.selector}`);
          } else {
            console.log(`❌ Не удалось закрыть: ${closeButton.selector}`);
          }
          
          // Пауза между закрытием баннеров
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          
        } catch (error) {
          console.error(`❌ Ошибка при закрытии ${closeButton.selector}:`, error.message);
        }
      }
      
      console.log(`📊 Закрыто баннеров: ${closedCount}/${closeButtons.length}`);
      
      return {
        closed: closedCount,
        total: closeButtons.length
      };
      
    } catch (error) {
      console.error('❌ Ошибка автоматического закрытия баннеров:', error.message);
      return { closed: 0, total: 0 };
    }
  }

  /**
   * Отладочный метод - показывает все возможные баннеры на странице
   */
  async debugBanners() {
    try {
      console.log('🔍 ОТЛАДКА: Поиск всех возможных баннеров...');
      
      // Ищем все элементы с классами, содержащими ключевые слова
      const debugSelectors = [
        'div[class*="Distribution"]',
        'div[class*="Modal"]',
        'div[class*="Popup"]',
        'div[class*="Banner"]',
        'div[class*="Splash"]',
        'div[class*="Overlay"]',
        'div[class*="Backdrop"]',
        'button[class*="Close"]',
        'button[class*="close"]',
        'button[aria-label*="закрыть" i]',
        'button[aria-label*="close" i]',
        'button[aria-label*="нет" i]',
        'button[title*="закрыть" i]',
        'button[title*="close" i]'
      ];
      
      for (const selector of debugSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          if (elements.length > 0) {
            console.log(`🔍 Найдено ${elements.length} элементов: ${selector}`);
            for (let i = 0; i < Math.min(elements.length, 3); i++) {
              const element = elements[i];
              if (await element.isVisible({ timeout: 1000 })) {
                const className = await element.getAttribute('class');
                const ariaLabel = await element.getAttribute('aria-label');
                const title = await element.getAttribute('title');
                console.log(`  📌 Элемент ${i + 1}: class="${className}", aria-label="${ariaLabel}", title="${title}"`);
              }
            }
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
      
      // Ищем по тексту
      const textElements = await this.page.locator('text="Сделать Яндекс основным поиском?"').all();
      if (textElements.length > 0) {
        console.log(`🔍 Найдено ${textElements.length} элементов с текстом "Сделать Яндекс основным поиском?"`);
        for (let i = 0; i < Math.min(textElements.length, 3); i++) {
          const element = textElements[i];
          if (await element.isVisible({ timeout: 1000 })) {
            const className = await element.getAttribute('class');
            const parent = element.locator('xpath=..');
            const parentClass = await parent.getAttribute('class');
            console.log(`  📌 Текст ${i + 1}: class="${className}", parent class="${parentClass}"`);
          }
        }
      }
      
      // Ищем все кнопки с aria-label содержащим "нет"
      const noButtons = await this.page.locator('button[aria-label*="нет" i]').all();
      if (noButtons.length > 0) {
        console.log(`🔍 Найдено ${noButtons.length} кнопок с aria-label содержащим "нет"`);
        for (let i = 0; i < Math.min(noButtons.length, 3); i++) {
          const element = noButtons[i];
          if (await element.isVisible({ timeout: 1000 })) {
            const className = await element.getAttribute('class');
            const ariaLabel = await element.getAttribute('aria-label');
            const title = await element.getAttribute('title');
            console.log(`  📌 Кнопка "нет" ${i + 1}: class="${className}", aria-label="${ariaLabel}", title="${title}"`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Ошибка отладки баннеров:', error.message);
    }
  }

  /**
   * Проверяет и закрывает баннеры после загрузки страницы
   */
  async handleBannersAfterLoad() {
    try {
      // Ждем загрузки страницы
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Отладочная информация
      await this.debugBanners();
      
      // Проверяем наличие баннеров
      const banners = await this.checkForBanners();
      
      if (banners.length > 0) {
        console.log(`🎯 Обнаружено ${banners.length} баннеров, запускаем закрытие...`);
        return await this.closeAllBanners();
      } else {
        // Дополнительная проверка через поиск кнопок закрытия
        console.log('🔍 Дополнительная проверка баннеров...');
        const closeButtons = await this.findCloseButtons();
        
        if (closeButtons.length > 0) {
          console.log(`🎯 Найдено ${closeButtons.length} кнопок закрытия, запускаем закрытие...`);
          return await this.closeAllBanners();
        } else {
          console.log('✅ Баннеры не обнаружены');
          return { closed: 0, total: 0 };
        }
      }
    } catch (error) {
      console.error('❌ Ошибка обработки баннеров:', error.message);
      return { closed: 0, total: 0 };
    }
  }

  /**
   * Ищет баннеры по тексту (для случаев, когда стандартные селекторы не работают)
   */
  async findBannersByText() {
    try {
      const textSelectors = [
        'text="Сделать Яндекс основным поиском?"',
        'text="Яндекс станет основным поиском"',
        'text="Нет, спасибо"',
        'text="Закрыть"',
        'text="Close"',
        'text="Отмена"',
        'text="Cancel"',
        'text="×"',
        'text="✕"'
      ];
      
      const foundBanners = [];
      
      for (const textSelector of textSelectors) {
        try {
          const elements = await this.page.locator(textSelector).all();
          for (const element of elements) {
            if (await element.isVisible({ timeout: 1000 })) {
              // Ищем родительский контейнер с кнопкой закрытия
              const parent = element.locator('xpath=..');
              const closeButton = parent.locator('button').first();
              
              if (await closeButton.isVisible({ timeout: 500 })) {
                foundBanners.push({
                  selector: textSelector,
                  element: closeButton,
                  type: 'text',
                  text: await element.textContent()
                });
              }
            }
          }
        } catch (e) {
          // Игнорируем ошибки поиска
        }
      }
      
      return foundBanners;
    } catch (error) {
      console.error('Ошибка поиска баннеров по тексту:', error.message);
      return [];
    }
  }

  /**
   * Добавляет новый селектор для баннеров
   */
  addBannerSelector(selector) {
    if (!this.bannerSelectors.includes(selector)) {
      this.bannerSelectors.push(selector);
      console.log(`➕ Добавлен селектор баннера: ${selector}`);
    }
  }

  /**
   * Добавляет новый селектор контейнера баннеров
   */
  addBannerContainerSelector(selector) {
    if (!this.bannerContainerSelectors.includes(selector)) {
      this.bannerContainerSelectors.push(selector);
      console.log(`➕ Добавлен селектор контейнера: ${selector}`);
    }
  }

  /**
   * Получает статистику по баннерам
   */
  getStats() {
    return {
      bannerSelectors: this.bannerSelectors.length,
      containerSelectors: this.bannerContainerSelectors.length,
      totalSelectors: this.bannerSelectors.length + this.bannerContainerSelectors.length
    };
  }
}
