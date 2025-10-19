export class RealisticCursor {
  constructor(page) {
    this.page = page;
    this.initialized = false;
    this.currentX = 0;
    this.currentY = 0;
    this.jitterInterval = null;
  }

  async init() {
    if (this.initialized) return;

    await this.page.addInitScript(() => {
      // Создаем видимый курсор
      const cursor = document.createElement('div');
      cursor.id = 'realistic-cursor';
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
        display: none;
      `;

      const init = () => {
        if (document.body) {
          document.body.appendChild(cursor);
          cursor.style.display = 'block';
        }
      };

      if (document.body) {
        init();
      } else {
        document.addEventListener('DOMContentLoaded', init);
      }

      window.currentMousePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        window.currentMousePosition = { x: e.clientX, y: e.clientY };
      });

      document.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
      });

      document.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      });
    });

    // Случайная начальная позиция (более естественно)
    const viewport = this.page.viewportSize();
    this.currentX = viewport.width * (0.3 + Math.random() * 0.4);
    this.currentY = viewport.height * (0.2 + Math.random() * 0.3);

    // Устанавливаем начальную позицию
    await this.page.mouse.move(this.currentX, this.currentY);

    this.initialized = true;
  }

  // Генерация кривой Безье (реалистичное движение)
  bezierCurve(start, end, cp1, cp2, t) {
    const x = Math.pow(1 - t, 3) * start.x +
              3 * Math.pow(1 - t, 2) * t * cp1.x +
              3 * (1 - t) * Math.pow(t, 2) * cp2.x +
              Math.pow(t, 3) * end.x;
              
    const y = Math.pow(1 - t, 3) * start.y +
              3 * Math.pow(1 - t, 2) * t * cp1.y +
              3 * (1 - t) * Math.pow(t, 2) * cp2.y +
              Math.pow(t, 3) * end.y;
              
    return { x, y };
  }

  // Функция easing для переменной скорости (ускорение и замедление)
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Микродрожание курсора (имитация тремора руки)
  async addJitter(x, y, intensity = 1) {
    const jitterX = x + (Math.random() - 0.5) * intensity * 2;
    const jitterY = y + (Math.random() - 0.5) * intensity * 2;
    return { x: jitterX, y: jitterY };
  }

  // Улучшенное плавное движение с переменной скоростью и паузами
  async moveSmooth(fromX, fromY, toX, toY, duration = 1000) {
    const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    const steps = Math.ceil(duration / 16); // 60 FPS
    
    // Выбор типа траектории (вариативность)
    const trajectoryType = Math.random();
    let cp1, cp2;

    if (trajectoryType < 0.4) {
      // Тип 1: Плавная дуга (уменьшенные отклонения)
      cp1 = {
        x: fromX + (toX - fromX) * 0.25 + (Math.random() - 0.5) * 30,
        y: fromY + (toY - fromY) * 0.25 + (Math.random() - 0.5) * 30
      };
      cp2 = {
        x: fromX + (toX - fromX) * 0.75 + (Math.random() - 0.5) * 30,
        y: fromY + (toY - fromY) * 0.75 + (Math.random() - 0.5) * 30
      };
    } else if (trajectoryType < 0.8) {
      // Тип 2: Почти прямая (минимальные отклонения)
      cp1 = {
        x: fromX + (toX - fromX) * 0.33 + (Math.random() - 0.5) * 15,
        y: fromY + (toY - fromY) * 0.33 + (Math.random() - 0.5) * 15
      };
      cp2 = {
        x: fromX + (toX - fromX) * 0.66 + (Math.random() - 0.5) * 15,
        y: fromY + (toY - fromY) * 0.66 + (Math.random() - 0.5) * 15
      };
    } else {
      // Тип 3: Прямая линия (без отклонений)
      cp1 = {
        x: fromX + (toX - fromX) * 0.33,
        y: fromY + (toY - fromY) * 0.33
      };
      cp2 = {
        x: fromX + (toX - fromX) * 0.66,
        y: fromY + (toY - fromY) * 0.66
      };
    }

    for (let i = 0; i <= steps; i++) {
      const rawT = i / steps;
      const t = this.easeInOutCubic(rawT); // Применяем easing
      
      const point = this.bezierCurve(
        { x: fromX, y: fromY },
        { x: toX, y: toY },
        cp1,
        cp2,
        t
      );

      // Добавляем микродрожание (уменьшенное)
      const jitteredPoint = await this.addJitter(point.x, point.y, 0.8);

      await this.page.mouse.move(jitteredPoint.x, jitteredPoint.y);

      await this.page.waitForTimeout(duration / steps);
    }

    this.currentX = toX;
    this.currentY = toY;
  }

  // Навести на элемент с увеличенным overshoot и коррекцией
  async moveTo(selector, speed = 'medium') {
    const element = this.page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Случайная точка внутри элемента
    const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

    const speeds = {
      slow: 2500,
      medium: 1500,
      fast: 800
    };

    await this.moveSmooth(
      this.currentX,
      this.currentY,
      targetX,
      targetY,
      speeds[speed] || speeds.medium
    );

    // Легкий overshoot (5-10px) - более естественный
    if (Math.random() > 0.3) { // 70% случаев
      const overshoot = 5 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      const overshootX = targetX + Math.cos(angle) * overshoot;
      const overshootY = targetY + Math.sin(angle) * overshoot;
      
      await this.moveSmooth(targetX, targetY, overshootX, overshootY, 200);
      await this.page.waitForTimeout(50 + Math.random() * 100);
      
      // Плавная коррекция обратно
      await this.moveSmooth(overshootX, overshootY, targetX, targetY, 200);
    }
    
    // Легкая инерция - одно микродвижение
    if (Math.random() > 0.5) { // 50% случаев
      const jitter = await this.addJitter(targetX, targetY, 1);
      await this.page.mouse.move(jitter.x, jitter.y);
      await this.page.waitForTimeout(50 + Math.random() * 100);
      await this.page.mouse.move(targetX, targetY);
    }

    this.currentX = targetX;
    this.currentY = targetY;
  }

  // Клик с увеличенным временем "обдумывания"
  async click(selector, options = {}) {
    const {
      thinking = true,
      doubleClick = false,
      speed = 'medium'
    } = options;

    await this.moveTo(selector, speed);

    if (thinking) {
      // Увеличенное время "думания" (500-2000ms)
      await this.page.waitForTimeout(500 + Math.random() * 1500);
    }

    // Микродвижение перед кликом
    const preClickJitter = await this.addJitter(this.currentX, this.currentY, 1);
    await this.page.mouse.move(preClickJitter.x, preClickJitter.y);
    await this.page.waitForTimeout(50);

    if (doubleClick) {
      await this.page.mouse.click(this.currentX, this.currentY, { clickCount: 2 });
    } else {
      await this.page.mouse.click(this.currentX, this.currentY);
    }

    // Движение после клика (как отдача)
    await this.page.mouse.move(
      this.currentX + (Math.random() - 0.5) * 30,
      this.currentY + (Math.random() - 0.5) * 30
    );

    this.currentX += (Math.random() - 0.5) * 30;
    this.currentY += (Math.random() - 0.5) * 30;

    // Небольшая пауза после клика
    await this.page.waitForTimeout(200 + Math.random() * 400);
  }

  // Hover с микродвижениями
  async hover(selector, duration = 1000) {
    await this.moveTo(selector);
    
    // Микродвижения во время hover
    const hoverSteps = Math.ceil(duration / 200);
    for (let i = 0; i < hoverSteps; i++) {
      const jitter = await this.addJitter(this.currentX, this.currentY, 3);
      await this.page.mouse.move(jitter.x, jitter.y);
      await this.page.waitForTimeout(200);
    }
  }

  // Случайные движения (изучение страницы)
  async exploreRandomly(count = 3) {
    const viewport = this.page.viewportSize();

    for (let i = 0; i < count; i++) {
      // Ограничиваем область движения (не по всему экрану)
      const centerX = viewport.width / 2;
      const centerY = viewport.height / 2;
      const maxDistance = Math.min(viewport.width, viewport.height) * 0.3; // 30% от размера экрана
      
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
        600 + Math.random() * 800 // Уменьшенная скорость
      );

      this.currentX = clampedX;
      this.currentY = clampedY;

      // Уменьшенная пауза между движениями
      await this.page.waitForTimeout(300 + Math.random() * 700);
    }
  }

  // Имитация "чтения" текста курсором
  async readText(selector, duration = 3000) {
    const element = this.page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) return;

    const lines = Math.ceil(box.height / 20); // Примерно 20px на строку
    const readingTime = duration / lines;

    for (let i = 0; i < lines; i++) {
      const startX = box.x + 10;
      const endX = box.x + box.width - 10;
      const y = box.y + (i + 0.5) * (box.height / lines);

      await this.moveSmooth(this.currentX, this.currentY, startX, y, readingTime * 0.3);
      await this.moveSmooth(startX, y, endX, y, readingTime * 0.7);
      
      this.currentX = endX;
      this.currentY = y;
      
      await this.page.waitForTimeout(100 + Math.random() * 200);
    }
  }

  // Прокрутка с естественным движением
  async scrollAndMove(direction = 'down', amount = 300) {
    const viewport = this.page.viewportSize();
    
    // Плавное движение к области прокрутки (не резкое)
    const targetX = viewport.width * (0.6 + Math.random() * 0.3);
    const targetY = viewport.height * (0.3 + Math.random() * 0.4);
    
    await this.moveSmooth(
      this.currentX,
      this.currentY,
      targetX,
      targetY,
      800 // Более медленное движение
    );

    this.currentX = targetX;
    this.currentY = targetY;

    // Прокрутка с паузами (как человек читает во время скролла)
    const scrollSteps = Math.ceil(amount / 80); // Меньшие шаги
    for (let i = 0; i < scrollSteps; i++) {
      await this.page.mouse.wheel(0, direction === 'down' ? 80 : -80);
      await this.page.waitForTimeout(200 + Math.random() * 400); // Больше времени на чтение
    }

    await this.page.waitForTimeout(500 + Math.random() * 800);
  }

  // Нервные движения во время ожидания (человек волнуется)
  async nervousWait(condition, maxDuration = 15000) {
    const startTime = Date.now();
    
    while (await condition() && (Date.now() - startTime < maxDuration)) {
      // Небольшие хаотичные движения вокруг текущей позиции
      const offsetX = (Math.random() - 0.5) * 150;
      const offsetY = (Math.random() - 0.5) * 150;
      
      await this.moveSmooth(
        this.currentX,
        this.currentY,
        this.currentX + offsetX,
        this.currentY + offsetY,
        300 + Math.random() * 400
      );
      
      await this.page.waitForTimeout(200 + Math.random() * 300);
    }
  }

  // Постоянное микродрожание (запускается в фоне)
  async startIdleJitter() {
    if (this.jitterInterval) return;

    this.jitterInterval = setInterval(async () => {
      if (!this.initialized) return;
      
      const jitter = await this.addJitter(this.currentX, this.currentY, 0.8);
      await this.page.mouse.move(jitter.x, jitter.y).catch(() => {});
    }, 800 + Math.random() * 1200);
  }

  // Остановка фонового дрожания
  stopIdleJitter() {
    if (this.jitterInterval) {
      clearInterval(this.jitterInterval);
      this.jitterInterval = null;
    }
  }
}