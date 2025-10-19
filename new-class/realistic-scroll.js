export class RealisticScroll {
  constructor(page, cursor) {
    this.page = page;
    this.cursor = cursor;
  }

  // Плавная прокрутка к элементу
  async scrollToElement(selector, options = {}) {
    const { 
      position = 'center', // 'top', 'center', 'bottom'
      readBefore = false,  // читать ли элементы по пути
      speed = 'medium'
    } = options;

    const element = this.page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element not found: ${selector}`);
    }

    const viewport = this.page.viewportSize();
    let targetY;

    // Вычисляем целевую позицию
    switch(position) {
      case 'top':
        targetY = 100;
        break;
      case 'bottom':
        targetY = viewport.height - box.height - 100;
        break;
      default: // center
        targetY = (viewport.height - box.height) / 2;
    }

    const currentScroll = await this.page.evaluate(() => window.scrollY);
    const targetScroll = currentScroll + (box.y - targetY);
    const scrollDistance = targetScroll - currentScroll;

    // Прокручиваем порциями
    const scrollStep = 100;
    const steps = Math.ceil(Math.abs(scrollDistance) / scrollStep);
    const direction = scrollDistance > 0 ? 1 : -1;

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, direction * scrollStep);
      
      // Двигаем курсор во время скролла
      if (this.cursor && Math.random() > 0.5) {
        const randomX = Math.random() * viewport.width;
        const randomY = Math.random() * viewport.height;
        await this.cursor.moveSmooth(
          this.cursor.currentX,
          this.cursor.currentY,
          randomX,
          randomY,
          300
        );
      }
      
      await this.page.waitForTimeout(150 + Math.random() * 200);
    }

    // Финальная подстройка
    await this.page.waitForTimeout(300 + Math.random() * 500);
  }

  // Прокрутить всю страницу с паузами (как человек читает)
  async scrollPage(direction = 'down', distance = null) {
    const viewport = this.page.viewportSize();
    const scrollHeight = await this.page.evaluate(() => document.body.scrollHeight);
    const totalDistance = distance || scrollHeight;
    
    const steps = Math.ceil(totalDistance / 400);

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, direction === 'down' ? 400 : -400);
      
      // Иногда останавливаемся "почитать"
      if (Math.random() > 0.7) {
        await this.page.waitForTimeout(1000 + Math.random() * 2000);
        
        // Двигаем курсор, как будто читаем
        if (this.cursor) {
          await this.cursor.exploreRandomly(1);
        }
      }
      
      await this.page.waitForTimeout(300 + Math.random() * 500);
    }
  }

  // Прокрутить до конца страницы с паузами для чтения
  async scrollToBottom(options = {}) {
    const { readingPauses = true, pauseChance = 0.3 } = options;
    
    const viewport = this.page.viewportSize();
    const scrollHeight = await this.page.evaluate(() => document.body.scrollHeight);
    const currentScroll = await this.page.evaluate(() => window.scrollY);
    const remainingHeight = scrollHeight - currentScroll - viewport.height;
    
    const steps = Math.ceil(remainingHeight / 300);
    
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, 300);
      
      // Паузы для чтения
      if (readingPauses && Math.random() < pauseChance) {
        await this.page.waitForTimeout(1500 + Math.random() * 3000);
        
        // Имитируем чтение
        if (this.cursor) {
          await this.cursor.exploreRandomly(1);
        }
      }
      
      await this.page.waitForTimeout(200 + Math.random() * 400);
    }
  }

  // Прокрутить и изучить элементы
  async scrollAndExplore(selector, options = {}) {
    const { 
      maxElements = 5, 
      hoverDuration = 2000,
      scrollStep = 300 
    } = options;
    
    const elements = await this.page.locator(selector).all();
    const elementsToExplore = elements.slice(0, maxElements);
    
    for (const element of elementsToExplore) {
      // Прокручиваем к элементу
      await element.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      
      // Наводим курсор и изучаем
      if (this.cursor) {
        const box = await element.boundingBox();
        if (box) {
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          
          await this.cursor.moveSmooth(
            this.cursor.currentX,
            this.cursor.currentY,
            centerX,
            centerY,
            800
          );
          
          // Изучаем элемент
          await this.page.waitForTimeout(hoverDuration);
          
          // Случайные микродвижения
          for (let i = 0; i < 3; i++) {
            const jitterX = centerX + (Math.random() - 0.5) * 50;
            const jitterY = centerY + (Math.random() - 0.5) * 50;
            await this.cursor.moveSmooth(
              this.cursor.currentX,
              this.cursor.currentY,
              jitterX,
              jitterY,
              300
            );
            await this.page.waitForTimeout(200 + Math.random() * 300);
          }
        }
      }
      
      // Прокручиваем немного дальше
      await this.page.mouse.wheel(0, scrollStep);
      await this.page.waitForTimeout(300 + Math.random() * 500);
    }
  }

  // Прокрутить к элементу и взаимодействовать с ним
  async scrollToAndInteract(selector, action = 'click', options = {}) {
    const { 
      position = 'center',
      thinkingTime = true,
      actionDelay = 1000 
    } = options;
    
    // Прокручиваем к элементу
    await this.scrollToElement(selector, { position });
    
    // Время на обдумывание
    if (thinkingTime) {
      await this.page.waitForTimeout(500 + Math.random() * 1500);
    }
    
    // Выполняем действие
    const element = this.page.locator(selector).first();
    
    switch (action) {
      case 'click':
        if (this.cursor) {
          await this.cursor.click(selector, { thinking: false });
        } else {
          await element.click();
        }
        break;
        
      case 'hover':
        if (this.cursor) {
          await this.cursor.hover(selector, actionDelay);
        } else {
          await element.hover();
          await this.page.waitForTimeout(actionDelay);
        }
        break;
        
      case 'read':
        if (this.cursor) {
          await this.cursor.readText(selector, actionDelay);
        } else {
          await this.page.waitForTimeout(actionDelay);
        }
        break;
        
      default:
        await element.click();
    }
    
    await this.page.waitForTimeout(300 + Math.random() * 500);
  }

  // Плавная прокрутка с переменной скоростью
  async smoothScroll(direction = 'down', distance = 500, options = {}) {
    const { 
      acceleration = true,
      deceleration = true,
      minSpeed = 50,
      maxSpeed = 200,
      pauseChance = 0.2
    } = options;
    
    const steps = Math.ceil(distance / 50);
    const speedRange = maxSpeed - minSpeed;
    
    for (let i = 0; i < steps; i++) {
      let speed = minSpeed;
      
      // Ускорение в начале
      if (acceleration && i < steps * 0.3) {
        const progress = i / (steps * 0.3);
        speed = minSpeed + speedRange * progress;
      }
      // Замедление в конце
      else if (deceleration && i > steps * 0.7) {
        const progress = (i - steps * 0.7) / (steps * 0.3);
        speed = maxSpeed - speedRange * progress;
      }
      // Постоянная скорость в середине
      else {
        speed = maxSpeed;
      }
      
      await this.page.mouse.wheel(0, direction === 'down' ? speed : -speed);
      
      // Случайные паузы
      if (Math.random() < pauseChance) {
        await this.page.waitForTimeout(200 + Math.random() * 600);
      }
      
      await this.page.waitForTimeout(50 + Math.random() * 100);
    }
  }

  // Прокрутка с поиском контента
  async scrollAndFind(selector, options = {}) {
    const { 
      maxScrolls = 10,
      scrollStep = 400,
      foundAction = 'stop' // 'stop', 'continue', 'interact'
    } = options;
    
    for (let i = 0; i < maxScrolls; i++) {
      // Проверяем, есть ли элемент на экране
      const element = this.page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      
      if (isVisible) {
        console.log(`🎯 Найден элемент: ${selector} на прокрутке ${i + 1}`);
        
        switch (foundAction) {
          case 'interact':
            await this.scrollToAndInteract(selector, 'hover');
            break;
          case 'continue':
            // Продолжаем прокрутку
            break;
          default: // 'stop'
            return true;
        }
      }
      
      // Прокручиваем дальше
      await this.page.mouse.wheel(0, scrollStep);
      await this.page.waitForTimeout(300 + Math.random() * 500);
    }
    
    return false; // Элемент не найден
  }
}