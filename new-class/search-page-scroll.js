export class SearchPageScroll {
  constructor(page, cursor) {
    this.page = page;
    this.cursor = cursor;
  }

  async smoothScroll(direction = 'down', distance = 200, options = {}) {
    const { steps = 15, delay = 80 } = options;
    const stepDistance = distance / steps;
    const stepDelay = delay;

    for (let i = 0; i < steps; i++) {
      const scrollAmount = direction === 'down' ? stepDistance : -stepDistance;
      await this.page.mouse.wheel(0, scrollAmount);
      
      // Двигаем курсор во время скролла для естественности
      if (this.cursor && Math.random() > 0.3) {
        const jitterX = (Math.random() - 0.5) * 5;
        const jitterY = (Math.random() - 0.5) * 5;
        
        await this.page.mouse.move(
          this.cursor.currentX + jitterX,
          this.cursor.currentY + jitterY
        );
        
        // Обновляем позицию видимого курсора
        await this.page.evaluate(({x, y}) => {
          const cursor = document.getElementById('search-page-cursor');
          if (cursor) {
            cursor.style.left = x + 'px';
            cursor.style.top = y + 'px';
          }
        }, {x: this.cursor.currentX + jitterX, y: this.cursor.currentY + jitterY});
      }
      
      await this.page.waitForTimeout(stepDelay);
    }
  }

  async scrollToElement(selector, options = {}) {
    const { position = 'center', readBefore = false, speed = 'medium' } = options;

    const element = this.page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element not found: ${selector}`);
    }

    const viewport = this.page.viewportSize();
    let targetY;

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

    // Прокручиваем порциями - делаем более плавно и медленно
    const scrollStep = 50; // Уменьшили размер шага
    const steps = Math.ceil(Math.abs(scrollDistance) / scrollStep);
    const direction = scrollDistance > 0 ? 1 : -1;

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, direction * scrollStep);
      
      // Двигаем курсор во время скролла
      if (this.cursor && Math.random() > 0.3) {
        const jitterX = (Math.random() - 0.5) * 3;
        const jitterY = (Math.random() - 0.5) * 3;
        
        const newX = this.cursor.currentX + jitterX;
        const newY = this.cursor.currentY + jitterY;
        
        await this.page.mouse.move(newX, newY);
        
        // Обновляем позицию курсора в объекте
        this.cursor.currentX = newX;
        this.cursor.currentY = newY;
        
        // Обновляем позицию видимого курсора
        await this.page.evaluate(({x, y}) => {
          const cursor = document.getElementById('search-page-cursor');
          if (cursor) {
            cursor.style.left = x + 'px';
            cursor.style.top = y + 'px';
          }
        }, {x: newX, y: newY});
      }
      
      // Увеличили задержку между шагами скролла
      await this.page.waitForTimeout(150 + Math.random() * 100);
    }
  }
}
