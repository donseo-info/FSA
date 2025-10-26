import fs from 'fs';
import path from 'path';

export class CaptchaSolver {
  constructor(options = {}) {
    this.captchaDir = options.captchaDir || './captcha_images';
    this.apiKey = options.apiKey || null;
    
    // URLs для BotLab API (согласно документации)
    this.createTaskUrl = 'http://app.botlab.me/create';
    this.getResultUrl = 'http://app.botlab.me/result';
    
    this.ensureDirectory();
  }

  // Создание папки для сохранения капчи
  ensureDirectory() {
    if (!fs.existsSync(this.captchaDir)) {
      fs.mkdirSync(this.captchaDir, { recursive: true });
      console.log(`📁 Создана папка: ${this.captchaDir}`);
    }
  }

  // Генерация уникального имени файла
  generateFileName(prefix = 'captcha') {
    const timestamp = Date.now();
    return `${prefix}_${timestamp}`;
  }

  // Сохранение изображения капчи с проверкой валидности
  async saveImage(imageUrl, page, filename, maxRetries = 5) {
    const minValidSize = 1024;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`  📥 Загрузка ${filename} (попытка ${attempt}/${maxRetries})...`);
        
        const response = await page.request.get(imageUrl);
        const buffer = await response.body();
        
        if (buffer.length < minValidSize) {
          console.log(`  ⚠️ Файл слишком маленький: ${buffer.length} байт`);
          
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 2000; // ← 2s, 4s, 8s, 16s, 32s
            console.log(`  ⏳ Повтор через ${delay/1000} сек...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error(`Файл слишком маленький после ${maxRetries} попыток`);
          }
        }
        
        // Определяем формат изображения
        let fileExtension = 'png';
        let isValid = false;
        
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        if (buffer.slice(0, 8).equals(pngSignature)) {
          fileExtension = 'png';
          isValid = true;
        }
        else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
          fileExtension = 'jpg';
          isValid = true;
        }
        else if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
          fileExtension = 'webp';
          isValid = true;
        }
        else if (buffer.slice(0, 6).toString() === 'GIF87a' || buffer.slice(0, 6).toString() === 'GIF89a') {
          fileExtension = 'gif';
          isValid = true;
        }
        
        if (!isValid) {
          console.log(`  ⚠️ Неизвестный формат, сохраняем как .bin`);
          fileExtension = 'bin';
        }
        
        const filePath = path.join(this.captchaDir, `${filename}.${fileExtension}`);
        fs.writeFileSync(filePath, buffer);
        
        console.log(`  ✅ Сохранено: ${filePath} (${buffer.length} байт, ${fileExtension.toUpperCase()})`);
        
        return filePath;
        
      } catch (error) {
        console.error(`  ❌ Ошибка: ${error.message}`);
        
        if (attempt >= maxRetries) {
          throw new Error(`Не удалось сохранить изображение: ${error.message}`);
        }
        
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Сохранение информации о капче
  saveInfo(mainCaptchaUrl, taskImageUrl, filename) {
    const infoPath = path.join(this.captchaDir, `${filename}_info.txt`);
    const info = [
      `Main Captcha URL:`,
      mainCaptchaUrl,
      ``,
      `Task Image URL:`,
      taskImageUrl,
      ``,
      `Timestamp: ${new Date().toISOString()}`
    ].join('\n');
    
    fs.writeFileSync(infoPath, info);
    console.log(`✅ Информация сохранена: ${infoPath}`);
    
    return infoPath;
  }

  // Поиск изображений капчи на странице
  async findCaptchaImages(page, silent = false) {
    if (!silent) {
      console.log('🔍 Ищем изображения капчи...');
    }
    
    try {
      const imagesInfo = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map((img) => ({
          src: img.src,
          alt: img.alt,
          className: img.className,
          visible: img.offsetWidth > 0 && img.offsetHeight > 0,
          width: img.offsetWidth,
          height: img.offsetHeight
        }));
      });

      const mainCaptcha = imagesInfo.find(img => 
        img.src.includes('captchaimage') && 
        img.alt === 'Задание с картинкой' &&
        img.visible &&
        img.width > 0 &&
        img.height > 0
      );

      const taskImage = imagesInfo.find(img => 
        img.className === 'TaskImage' &&
        img.visible &&
        img.width > 0 &&
        img.height > 0
      );

      if (!mainCaptcha || !taskImage) {
        if (!silent) {
          console.log('⚠️ Не все изображения найдены');
        }
        return null;
      }

      if (!silent) {
        console.log('🎯 Найдены обе картинки капчи!');
        console.log(`  📏 Основная: ${mainCaptcha.width}x${mainCaptcha.height}px`);
        console.log(`  📏 TaskImage: ${taskImage.width}x${taskImage.height}px`);
      }
      
      return { mainCaptcha, taskImage };
      
    } catch (error) {
      if (!silent) {
        console.error('❌ Ошибка поиска:', error.message);
      }
      return null;
    }
  }

  // Поиск с retry
async findCaptchaImagesWithRetry(page, maxRetries = 10) {
    console.log('🔍 Ожидаем загрузки изображений...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const silent = attempt > 1;
      
      if (attempt > 1) {
        console.log(`  Попытка ${attempt}/${maxRetries}...`);
      }
      
      const images = await this.findCaptchaImages(page, silent);
      
      if (images) {
        if (attempt > 1) {
          console.log(`  ✅ Изображения найдены с попытки ${attempt}`);
        }
        return images;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 2000;
        console.log(`  ⏳ Ожидание ${delay/2000} сек...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }

  // Обработка капчи на странице Яндекса
  async handleYandexCaptcha(page, cursor) {
    
    try {
      console.log('⚠️ Обнаружена капча Яндекса');
      
      // Отладочная информация - проверяем доступные селекторы
      console.log('🔍 Отладка: ищем доступные селекторы капчи...');
      const possibleSelectors = [
        '.CheckboxCaptcha-Anchor',
        '.Captcha-Anchor', 
        '.captcha-anchor',
        '[data-captcha]',
        '.captcha-checkbox',
        '.checkbox-captcha',
        'input[type="checkbox"]',
        '.captcha',
        '#captcha',
        'button[aria-label*="капч"]',
        'button[aria-label*="captcha"]',
        'button',
        'input',
        '.button',
        '[role="button"]'
      ];
      
      for (const selector of possibleSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ Найден селектор: ${selector} (${count} элементов)`);
          const isVisible = await page.locator(selector).first().isVisible().catch(() => false);
          console.log(`   Видимый: ${isVisible}`);
        } else {
          console.log(`❌ Селектор не найден: ${selector}`);
        }
      }
      
      // Прокручиваем к элементу капчи и кликаем по нему
      console.log('📍 Прокручиваем к элементу капчи...');
      await page.locator('.CheckboxCaptcha-Anchor').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      console.log('🎯 Подводим курсор к элементу капчи...');
      await cursor.moveTo('.CheckboxCaptcha-Anchor', 'fast');
      await page.waitForTimeout(2000);
      
      console.log('👆 Кликаем по чекбоксу...');
      
      // Получаем координаты чекбокса для плавного движения
      const checkboxBox = await page.locator('.CheckboxCaptcha-Anchor').boundingBox();
      if (checkboxBox) {
        const targetX = checkboxBox.x + checkboxBox.width / 2;
        const targetY = checkboxBox.y + checkboxBox.height / 2;
        
        // Плавно двигаем курсор к чекбоксу
        await cursor.moveSmooth(cursor.currentX, cursor.currentY, targetX, targetY, 500);
        
        // Принудительно обновляем визуальный курсор
        await page.evaluate(({ x, y }) => {
          const cursor = document.getElementById('realistic-cursor');
          if (cursor) {
            cursor.style.left = x + 'px';
            cursor.style.top = y + 'px';
          }
        }, { x: targetX, y: targetY });
        
        // Кликаем в координаты
        await page.mouse.click(targetX, targetY);
        
        // Обновляем позицию курсора
        cursor.currentX = targetX;
        cursor.currentY = targetY;
      } else {
        // Fallback к обычному клику
        await cursor.click('.CheckboxCaptcha-Anchor', { 
          thinking: true,
          speed: 'fast' 
        });
      }

      console.log('⏳ Ждем проверку...');
      
      // Нервные движения мышью
      const spinner = page.locator('.CheckboxCaptcha-Spin');
      await cursor.nervousWait(
        async () => await spinner.isVisible().catch(() => false),
        15000
      );
      
      console.log('✅ Индикатор исчез, проверяем результат...');
      await page.waitForTimeout(2000);
      
      // Проверяем редирект
      if (!page.url().includes('showcaptcha')) {
        console.log('✅ Простая капча пройдена автоматически!');
        return { solved: true, type: 'simple' };
      }
      
      // Ищем изображения
      const images = await this.findCaptchaImagesWithRetry(page, 5);
      
      if (!images) {
        throw new Error('Изображения капчи не найдены');
      }
      
      // Сохраняем изображения
      const filename = this.generateFileName('captcha');
      
      console.log('📥 Сохраняем изображения...');
      
      const mainCaptchaPath = await this.saveImage(
        images.mainCaptcha.src, 
        page, 
        `${filename}_main`,
        3
      );
      
      const taskImagePath = await this.saveImage(
        images.taskImage.src, 
        page, 
        `${filename}_task`,
        3
      );
      
      const infoPath = this.saveInfo(
        images.mainCaptcha.src,
        images.taskImage.src,
        filename
      );
      
      const savedFiles = {
        mainCaptchaPath,
        taskImagePath,
        infoPath,
        filename
      };
      
      console.log('\n📦 Файлы капчи сохранены:');
      console.log(`  Main: ${savedFiles.mainCaptchaPath}`);
      console.log(`  Task: ${savedFiles.taskImagePath}`);
      console.log(`  Info: ${savedFiles.infoPath}`);
      
      return { 
        solved: false, 
        type: 'complex',
        files: savedFiles 
      };
      
    } catch (error) {
      console.error('❌ Ошибка обработки капчи:', error.message);
      console.log('📍 Текущий URL:', page.url());
      
      if (page.isClosed()) {
        console.error('❌ Страница была закрыта!');
      }
      
      throw error;
    }
  }

  // Ожидание ручного решения
  async waitForManualSolution() {
    console.log('\n⏸️ Нажмите Enter после ручного решения...');
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  // Решение через BotLab SmartCaptcha (по правильной документации)
  async solveBotLabSmartCaptcha(mainCaptchaPath, taskImagePath) {
    console.log('📤 Отправка на BotLab SmartCaptcha...');
    
    if (!this.apiKey) {
      throw new Error('API ключ не настроен');
    }

    try {
      // Читаем изображения в base64
      const clickBase64 = fs.readFileSync(mainCaptchaPath, { encoding: 'base64' });
      const taskBase64 = fs.readFileSync(taskImagePath, { encoding: 'base64' });

      console.log(`📊 Размер click: ${clickBase64.length} символов`);
      console.log(`📊 Размер task: ${taskBase64.length} символов`);

      // Формируем запрос согласно документации BotLab
      const requestBody = {
        type: "SmartCaptcha",
        click: clickBase64,
        task: taskBase64
      };

      console.log('📨 Отправка задачи...');
      
      // Создаем задачу
      const createResponse = await fetch(this.createTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📡 HTTP Статус: ${createResponse.status}`);

      const responseText = await createResponse.text();
      console.log(`📄 Ответ: ${responseText}`);

      if (!createResponse.ok) {
        throw new Error(`HTTP ${createResponse.status}: ${responseText}`);
      }

      const createResult = JSON.parse(responseText);

      if (createResult.status !== 1) {
        throw new Error(`BotLab error: ${createResult.response}`);
      }

      const taskId = createResult.response;
      console.log(`✅ Задача создана, ID: ${taskId}`);
      console.log('⏳ Ожидаем решения...');

      // Ждем решения
      return await this.waitBotLabResult(taskId);

    } catch (error) {
      console.error('❌ Ошибка BotLab:', error.message);
      throw error;
    }
  }

  // Получение результата от BotLab
 async waitBotLabResult(taskId, maxAttempts = 120) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 1 секунда согласно документации

      const requestBody = {
        id: taskId
      };

      try {
        const response = await fetch(this.getResultUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        
        if (attempt % 5 === 0) {
          console.log(`⏳ Попытка ${attempt}/${maxAttempts}: ${responseText.substring(0, 50)}...`);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        const result = JSON.parse(responseText);

        if (result.status === 1) {
          console.log(`✅ Капча решена!`);
          console.log(`🔢 Координаты: ${result.response}`);
          return result.response;
        }

        if (result.response === 'CAPCHA_NOT_READY') {
          continue;
        }

        throw new Error(`BotLab error: ${result.response}`);

      } catch (error) {
        if (attempt >= maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Превышено время ожидания (60 секунд)');
  }

  // Ввод координат на странице (клики по капче)
// Ввод координат на странице (клики по капче)
  async enterCoordinates(page, coordinates, cursor) {
    console.log(`⌨️ Обрабатываем координаты: ${coordinates}`);
    
    // Парсим координаты: "coordinates:x=34.7,y=108.0;x=234.3,y=72.3;..."
    const coordString = coordinates.replace('coordinates:', '');
    const coordPairs = coordString.split(';');
    
    console.log(`📍 Найдено точек для клика: ${coordPairs.length}`);
    
    try {
      // Находим область капчи для кликов
      const captchaImageSelector = 'img[alt="Задание с картинкой"]';
      const captchaImage = page.locator(captchaImageSelector).first();
      const box = await captchaImage.boundingBox();
      
      if (!box) {
        throw new Error('Не найдена область капчи для кликов');
      }
      
      console.log(`📦 Область капчи: ${box.x}, ${box.y}, ${box.width}x${box.height}`);
      
      // Кликаем по каждой точке
      for (let i = 0; i < coordPairs.length; i++) {
        const pair = coordPairs[i].trim();
        const xMatch = pair.match(/x=([\d.]+)/);
        const yMatch = pair.match(/y=([\d.]+)/);
        
        if (xMatch && yMatch) {
          const x = parseFloat(xMatch[1]);
          const y = parseFloat(yMatch[1]);
          
          // Вычисляем абсолютные координаты
          const absX = box.x + x;
          const absY = box.y + y;
          
          console.log(`👆 Клик ${i + 1}/${coordPairs.length}: x=${x.toFixed(1)}, y=${y.toFixed(1)} (абс: ${absX.toFixed(1)}, ${absY.toFixed(1)})`);
          
          // Плавно двигаем курсор и кликаем
          await cursor.moveSmooth(cursor.currentX, cursor.currentY, absX, absY, 300);
          await page.mouse.click(absX, absY);
          await page.waitForTimeout(500 + Math.random() * 500); // ← 500-1000ms
          
          cursor.currentX = absX;
          cursor.currentY = absY;
        }
      }
      
      console.log('✅ Все клики выполнены');
      await page.waitForTimeout(500);
      
      // Находим и кликаем кнопку отправки
      console.log('🔍 Ищем кнопку отправки...');
      const submitButton = page.locator('.CaptchaButton-SubmitContent');
      const submitExists = await submitButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (submitExists) {
        console.log('👆 Нажимаем кнопку отправки...');
        
        // Наводим курсор на кнопку
        await cursor.moveTo('.CaptchaButton-SubmitContent', 'fast');
        await page.waitForTimeout(3000); // ← 3 секунды
        
        // Кликаем
        await cursor.click('.CaptchaButton-SubmitContent', {
          thinking: true,
          speed: 'fast'
        });
        
        console.log('✅ Кнопка отправки нажата');
      } else {
        console.log('⚠️ Кнопка отправки не найдена, пробуем альтернативные варианты...');
        
        // Пробуем альтернативные селекторы
        const altSelectors = [
          '.CaptchaButton-ProgressWrapper',
          'button[type="submit"]',
          'button.Button_type_submit'
        ];
        
        for (const selector of altSelectors) {
          const altButton = page.locator(selector);
          const altExists = await altButton.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (altExists) {
            console.log(`✅ Найдена альтернативная кнопка: ${selector}`);
            await cursor.click(selector, { speed: 'fast' });
            console.log('✅ Альтернативная кнопка нажата');
            break;
          }
        }
      }
      
      // Проверяем результат
      console.log('⏳ Ожидаем результат проверки капчи...');
      await page.waitForTimeout(5000);
      
      if (!page.url().includes('showcaptcha')) {
        console.log('🎉 Капча успешно пройдена!');
        return true;
      } else {
        console.log('❌ Капча не пройдена');
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Ошибка ввода координат: ${error.message}`);
      return false;
    }
  }

  // Полный цикл: обработка + автоматическое решение
  async solveAndSubmit(page, cursor) {
    // Сначала проверяем, есть ли капча на странице
    const hasCaptcha = await page.locator('.CheckboxCaptcha-Anchor').count() > 0;
    if (!hasCaptcha) {
      console.log('✅ Капча не обнаружена на странице');
      return false;
    }
    
    console.log('⚠️ Обнаружена капча Яндекса');
    // Обрабатываем капчу
    const result = await this.handleYandexCaptcha(page, cursor);
    
    if (result.solved) {
      return true;
    }
    
    // Пытаемся решить автоматически
    if (this.apiKey) {
      console.log('\n🤖 Запускаем автоматическое решение...');
      
      const coordinates = await this.solveBotLabSmartCaptcha(
        result.files.mainCaptchaPath,
        result.files.taskImagePath
      );
      
      if (coordinates) {
        const success = await this.enterCoordinates(page, coordinates, cursor);
        
        if (success) {
          console.log('🎉 Капча решена автоматически!');
          return true;
        } else {
          console.log('❌ Решение не подошло');
          return false;
        }
      }
    }
    
    // Если не получилось - ждем ручного решения
    console.log('⚠️ Автоматическое решение недоступно');
    await this.waitForManualSolution();
    return false;
  }

  // Очистка старых файлов
  cleanOldCaptchas(olderThanHours = 24) {
    console.log(`🧹 Очистка файлов старше ${olderThanHours} часов...`);
    
    const now = Date.now();
    const maxAge = olderThanHours * 60 * 60 * 1000;
    let deletedCount = 0;
    
    try {
      const files = fs.readdirSync(this.captchaDir);
      
      files.forEach(file => {
        const filePath = path.join(this.captchaDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
      
      console.log(`✅ Удалено: ${deletedCount}`);
    } catch (error) {
      console.error('❌ Ошибка очистки:', error.message);
    }
  }

  // Статистика
  getStats() {
    try {
      const files = fs.readdirSync(this.captchaDir);
      const mainCaptchas = files.filter(f => f.includes('_main.'));
      const taskImages = files.filter(f => f.includes('_task.'));
      const infoFiles = files.filter(f => f.includes('_info.txt'));
      
      return {
        total: files.length,
        mainCaptchas: mainCaptchas.length,
        taskImages: taskImages.length,
        infoFiles: infoFiles.length
      };
    } catch (error) {
      console.error('❌ Ошибка статистики:', error.message);
      return null;
    }
  }
}