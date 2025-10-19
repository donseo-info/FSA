export class SearchPageCursor {
  constructor(page) {
    this.page = page;
    this.currentX = 0;
    this.currentY = 0;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Создаем видимый курсор на странице
    await this.page.evaluate(() => {
      // Удаляем старый курсор если есть
      const oldCursor = document.getElementById('search-page-cursor');
      if (oldCursor) {
        oldCursor.remove();
      }
      
      // Создаем новый видимый курсор
      const cursor = document.createElement('div');
      cursor.id = 'search-page-cursor';
      cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,50,50,0.9) 0%, rgba(255,0,0,0.5) 100%);
        border: 2px solid white;
        pointer-events: none;
        z-index: 2147483647;
        transition: transform 0.1s ease;
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
        transform: translate(-50%, -50%);
        display: block;
        left: 50%;
        top: 50%;
      `;
      
      document.body.appendChild(cursor);
    });
    
    // Инициализируем координаты
    const viewport = this.page.viewportSize();
    this.currentX = viewport.width / 2;
    this.currentY = viewport.height / 2;
    
    this.initialized = true;
    console.log('✅ SearchPageCursor инициализирован');
  }

  async moveSmooth(fromX, fromY, toX, toY, duration = 1000) {
    const steps = Math.max(50, Math.floor(duration / 20));
    const stepX = (toX - fromX) / steps;
    const stepY = (toY - fromY) / steps;
    const stepDelay = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const currentX = fromX + stepX * i;
      const currentY = fromY + stepY * i;
      
      // Добавляем небольшие случайные отклонения для естественности
      const jitterX = (Math.random() - 0.5) * 0.5;
      const jitterY = (Math.random() - 0.5) * 0.5;
      
      const finalX = currentX + jitterX;
      const finalY = currentY + jitterY;
      
      await this.page.mouse.move(finalX, finalY, { steps: 1 });
      
      // Обновляем позицию видимого курсора
      await this.page.evaluate(({x, y}) => {
        const cursor = document.getElementById('search-page-cursor');
        if (cursor) {
          cursor.style.left = x + 'px';
          cursor.style.top = y + 'px';
        }
      }, {x: finalX, y: finalY});
      
      this.currentX = finalX;
      this.currentY = finalY;
      
      // Добавляем небольшую случайную задержку для естественности
      const randomDelay = stepDelay + (Math.random() - 0.5) * 10;
      await this.page.waitForTimeout(Math.max(5, randomDelay));
    }
  }

  async exploreRandomly(count = 3) {
    const viewport = this.page.viewportSize();

    for (let i = 0; i < count; i++) {
      // Ограничиваем область движения
      const centerX = viewport.width / 2;
      const centerY = viewport.height / 2;
      const maxDistance = Math.min(viewport.width, viewport.height) * 0.3;
      
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * maxDistance;
      const targetX = centerX + Math.cos(angle) * distance;
      const targetY = centerY + Math.sin(angle) * distance;

      // Ограничиваем координаты в пределах экрана
      const clampedX = Math.max(50, Math.min(viewport.width - 50, targetX));
      const clampedY = Math.max(50, Math.min(viewport.height - 50, targetY));

      await this.moveSmooth(
        this.currentX,
        this.currentY,
        clampedX,
        clampedY,
        600 + Math.random() * 800
      );

      // Пауза между движениями
      await this.page.waitForTimeout(300 + Math.random() * 700);
    }
  }

  async readText(selector, duration = 3000) {
    const element = this.page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) return;

    // Простое чтение - двигаемся по центру элемента
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    // Небольшие движения вокруг центра элемента
    const movements = Math.min(3, Math.ceil(duration / 1000));
    
    for (let i = 0; i < movements; i++) {
      const offsetX = (Math.random() - 0.5) * (box.width * 0.3);
      const offsetY = (Math.random() - 0.5) * (box.height * 0.3);
      
      const targetX = centerX + offsetX;
      const targetY = centerY + offsetY;
      
      await this.moveSmooth(this.currentX, this.currentY, targetX, targetY, 500);
      await this.page.waitForTimeout(300 + Math.random() * 500);
    }
    
    // Возвращаемся к центру элемента
    await this.moveSmooth(this.currentX, this.currentY, centerX, centerY, 300);
  }

  async moveTo(selector, speed = 'medium') {
    const element = this.page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element not found: ${selector}`);
    }

    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;

    const duration = speed === 'fast' ? 500 : speed === 'slow' ? 1500 : 1000;
    
    await this.moveSmooth(this.currentX, this.currentY, targetX, targetY, duration);
  }
}
