/**
 * Canvas Fingerprinting Protection - РАБОТАЮЩАЯ ВЕРСИЯ
 * Патчим toDataURL напрямую, но эффективно
 */
class CanvasSpoof {
  constructor(options = {}) {
    this.seed = options.seed || Math.floor(Math.random() * 1000000);
  }

  /**
   * Генерирует JavaScript код для подмены Canvas
   */
  getInjectionCode() {
    const seed = this.seed;

    return `
      // ===== CANVAS FINGERPRINTING PROTECTION =====
      (function() {
        'use strict';
        
        const SEED = ${seed};
        
        // Seeded random
        function makeRandom(seed) {
          return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
          };
        }
        
        // Кэш для уже модифицированных canvas
        const canvasCache = new WeakMap();
        
        // ========================================
        // Патчим toDataURL - ГЛАВНЫЙ метод fingerprinting
        // ========================================
        const OrigToDataURL = HTMLCanvasElement.prototype.toDataURL;
        
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
          console.log('[CanvasSpoof] toDataURL called:', this.width, 'x', this.height);
          
          // Маленькие canvas не трогаем
          if (this.width <= 16 || this.height <= 16) {
            console.log('[CanvasSpoof] Canvas too small, skipping');
            return OrigToDataURL.apply(this, args);
          }
          
          // Проверяем кэш
          if (canvasCache.has(this)) {
            console.log('[CanvasSpoof] Returning cached result');
            return canvasCache.get(this);
          }
          
          try {
            const ctx = this.getContext('2d');
            if (!ctx) {
              console.log('[CanvasSpoof] No 2d context');
              return OrigToDataURL.apply(this, args);
            }
            
            console.log('[CanvasSpoof] Applying noise...');
            
            // Читаем данные
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;
            
            // Применяем консистентный шум
            const random = makeRandom(SEED + this.width + this.height);
            
            // Изменяем 5% пикселей (было 0.5%)
            const pixelsToModify = Math.floor(data.length / 4 * 0.05);
            
            console.log('[CanvasSpoof] Modifying', pixelsToModify, 'pixels');
            
            for (let i = 0; i < pixelsToModify; i++) {
              const index = Math.floor(random() * (data.length / 4)) * 4;
              const noise = (random() - 0.5) * 0.002 * 255; // Увеличили шум в 10 раз
              
              // Изменяем RGB (не Alpha)
              for (let j = 0; j < 3; j++) {
                const oldValue = data[index + j];
                const newValue = Math.max(0, Math.min(255, oldValue + noise));
                data[index + j] = Math.floor(newValue);
              }
            }
            
            // Записываем обратно
            ctx.putImageData(imageData, 0, 0);
            
            console.log('[CanvasSpoof] Noise applied, getting result');
            
            // Получаем результат
            const result = OrigToDataURL.apply(this, args);
            
            console.log('[CanvasSpoof] Result hash:', result.substring(0, 50));
            
            // Сохраняем в кэш
            canvasCache.set(this, result);
            
            return result;
            
          } catch (e) {
            console.error('[CanvasSpoof] ERROR:', e.message);
            // Tainted canvas или другая ошибка
            return OrigToDataURL.apply(this, args);
          }
        };
        
        // ========================================
        // Патчим toBlob
        // ========================================
        const OrigToBlob = HTMLCanvasElement.prototype.toBlob;
        
        HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
          if (this.width <= 16 || this.height <= 16) {
            return OrigToBlob.call(this, callback, ...args);
          }
          
          try {
            const ctx = this.getContext('2d');
            if (!ctx) {
              return OrigToBlob.call(this, callback, ...args);
            }
            
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;
            
            const random = makeRandom(SEED + this.width + this.height);
            const pixelsToModify = Math.floor(data.length / 4 * 0.005);
            
            for (let i = 0; i < pixelsToModify; i++) {
              const index = Math.floor(random() * (data.length / 4)) * 4;
              const noise = (random() - 0.5) * 0.0002 * 255;
              
              for (let j = 0; j < 3; j++) {
                data[index + j] = Math.max(0, Math.min(255, data[index + j] + noise));
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            return OrigToBlob.call(this, callback, ...args);
            
          } catch (e) {
            return OrigToBlob.call(this, callback, ...args);
          }
        };
        
        // ========================================
        // Патчим getImageData - ПРЯМАЯ МОДИФИКАЦИЯ
        // ========================================
        const OrigGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
          const imageData = OrigGetImageData.call(this, sx, sy, sw, sh);
          
          if (sw > 16 && sh > 16) {
            const data = imageData.data; // Uint8ClampedArray
            const random = makeRandom(SEED + sw + sh);
            
            // Модифицируем напрямую
            const totalPixels = data.length / 4;
            const modifyCount = Math.floor(totalPixels * 0.1); // 10% пикселей
            
            for (let i = 0; i < modifyCount; i++) {
              const pixelIndex = Math.floor(random() * totalPixels);
              const index = pixelIndex * 4;
              
              // Изменяем R канал
              if (data[index] > 0) {
                data[index] = data[index] - 1;
              } else if (data[index] < 255) {
                data[index] = data[index] + 1;
              }
            }
          }
          
          return imageData;
        };
        
        console.log('[CanvasSpoof] ✅ Active (seed: ' + SEED + ')');
        
      })();
    `;
  }

  /**
   * Применяет подмену к странице
   */
  async apply(page) {
    await page.addInitScript(this.getInjectionCode());
    console.log(`🎨 Canvas: Protected (seed: ${this.seed})`);
  }
}

export { CanvasSpoof };