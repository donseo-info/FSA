/**
 * Подмена WebGL Fingerprinting с поддержкой ANGLE формата
 */
class WebGLSpoof {
  constructor(options = {}) {
    this.gpu = options.gpu || { 
      vendor: "Google Inc. (Intel)", 
      renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)" 
    };
    this.seed = options.seed || Math.floor(Math.random() * 1000000);
    
    // Генерируем уникальные вариации на основе seed
    this.generateVariations();
  }
  
  /**
   * Генерирует уникальные вариации GPU на основе seed
   */
  generateVariations() {
    const vendors = [
      "Google Inc. (Intel)",
      "Google Inc. (NVIDIA)", 
      "Google Inc. (AMD)",
      "Google Inc. (Microsoft)"
    ];
    
    const renderers = [
      "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Super Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)"
    ];
    
    // Используем seed для выбора vendor и renderer
    const vendorIndex = this.seed % vendors.length;
    const rendererIndex = (this.seed * 7) % renderers.length;
    
    this.gpu.vendor = vendors[vendorIndex];
    this.gpu.renderer = renderers[rendererIndex];
  }

  /**
   * Генерирует JavaScript код для подмены WebGL
   */
  getInjectionCode() {
    const vendor = JSON.stringify(this.gpu.vendor);
    const renderer = JSON.stringify(this.gpu.renderer);
    const seed = this.seed;

    return `
      // ===== WEBGL SPOOFING WITH ANGLE =====
      (function() {
        const VENDOR = ${vendor};
        const RENDERER = ${renderer};
        let seedValue = ${seed};
        
        const random = () => {
          seedValue = (seedValue * 9301 + 49297) % 233280;
          return seedValue / 233280;
        };
        
        const generateNoise = () => {
          return (random() - 0.5) * 0.0001;
        };
        
        // Патчим getParameter для WebGL контекстов
        const patchGetParameter = (context) => {
          const originalGetParameter = context.getParameter.bind(context);
          
          context.getParameter = function(param) {
            // VENDOR (0x1F00)
            if (param === 0x1F00 || param === context.VENDOR) {
              return VENDOR;
            }
            
            // RENDERER (0x1F01)
            if (param === 0x1F01 || param === context.RENDERER) {
              return RENDERER;
            }
            
            // UNMASKED_VENDOR_WEBGL (0x9245)
            if (param === 0x9245) {
              return VENDOR;
            }
            
            // UNMASKED_RENDERER_WEBGL (0x9246)
            if (param === 0x9246) {
              return RENDERER;
            }
            
            return originalGetParameter(param);
          };
        };
        
        // Патчим getSupportedExtensions
        const patchGetSupportedExtensions = (context) => {
          const originalGetSupportedExtensions = context.getSupportedExtensions.bind(context);
          
          context.getSupportedExtensions = function() {
            const extensions = originalGetSupportedExtensions();
            
            // Всегда включаем WEBGL_debug_renderer_info
            if (extensions && !extensions.includes('WEBGL_debug_renderer_info')) {
              extensions.push('WEBGL_debug_renderer_info');
            }
            
            return extensions;
          };
        };
        
        // Патчим getExtension
        const patchGetExtension = (context) => {
          const originalGetExtension = context.getExtension.bind(context);
          
          context.getExtension = function(name) {
            const extension = originalGetExtension(name);
            
            // Патчим WEBGL_debug_renderer_info
            if (name === 'WEBGL_debug_renderer_info' && extension) {
              // Перезаписываем константы
              Object.defineProperty(extension, 'UNMASKED_VENDOR_WEBGL', {
                value: 0x9245,
                enumerable: true,
                writable: false,
                configurable: true
              });
              Object.defineProperty(extension, 'UNMASKED_RENDERER_WEBGL', {
                value: 0x9246,
                enumerable: true,
                writable: false,
                configurable: true
              });
            }
            
            return extension;
          };
        };
        
        // Патчим readPixels для canvas fingerprinting
        const patchReadPixels = (context) => {
          const originalReadPixels = context.readPixels.bind(context);
          
          context.readPixels = function(x, y, width, height, format, type, pixels) {
            originalReadPixels(x, y, width, height, format, type, pixels);
            
            // Добавляем более агрессивный шум для уникальности фингерпринта
            if (pixels && pixels.length) {
              for (let i = 0; i < pixels.length; i += 50) {
                const noise = Math.floor(generateNoise() * 10);
                pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise));
              }
              
              // Добавляем уникальные изменения в первые несколько пикселей
              for (let i = 0; i < Math.min(10, pixels.length); i++) {
                const uniqueNoise = Math.floor(random() * 3);
                pixels[i] = Math.min(255, Math.max(0, pixels[i] + uniqueNoise));
              }
            }
            
            return pixels;
          };
        };
        
        // Патчим getShaderPrecisionFormat
        const patchGetShaderPrecisionFormat = (context) => {
          const originalGetShaderPrecisionFormat = context.getShaderPrecisionFormat.bind(context);
          
          context.getShaderPrecisionFormat = function(shaderType, precisionType) {
            const format = originalGetShaderPrecisionFormat(shaderType, precisionType);
            
            if (format) {
              const noise = Math.floor(random() * 2);
              
              return {
                rangeMin: format.rangeMin,
                rangeMax: format.rangeMax,
                precision: format.precision + noise
              };
            }
            
            return format;
          };
        };
        
        // Перехватываем создание WebGL контекстов
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        
        HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
          const context = originalGetContext.apply(this, arguments);
          
          if (context && (contextType === 'webgl' || contextType === 'webgl2' || 
                          contextType === 'experimental-webgl')) {
            
            // Применяем патчи только один раз
            if (!context.__webgl_spoofed) {
              patchGetParameter(context);
              patchGetSupportedExtensions(context);
              patchGetExtension(context);
              patchReadPixels(context);
              patchGetShaderPrecisionFormat(context);
              
              context.__webgl_spoofed = true;
              
              console.log('[WebGLSpoof] ✅ Context patched');
              console.log('[WebGLSpoof] Vendor:', VENDOR);
              console.log('[WebGLSpoof] Renderer:', RENDERER);
            }
          }
          
          return context;
        };
        
        // Патчим OffscreenCanvas если доступен
        if (typeof OffscreenCanvas !== 'undefined') {
          const originalOffscreenGetContext = OffscreenCanvas.prototype.getContext;
          
          OffscreenCanvas.prototype.getContext = function(contextType, contextAttributes) {
            const context = originalOffscreenGetContext.apply(this, arguments);
            
            if (context && (contextType === 'webgl' || contextType === 'webgl2')) {
              if (!context.__webgl_spoofed) {
                patchGetParameter(context);
                patchGetSupportedExtensions(context);
                patchGetExtension(context);
                patchReadPixels(context);
                patchGetShaderPrecisionFormat(context);
                
                context.__webgl_spoofed = true;
              }
            }
            
            return context;
          };
        }
        
        console.log('[WebGLSpoof] 🎉 Initialization complete');
        
      })();
    `;
  }

  /**
   * Применяет подмену к странице
   */
  async apply(page) {
    await page.addInitScript(this.getInjectionCode());
    
    // Выводим короткую версию для консоли
    const shortName = this.gpu.renderer.includes('ANGLE') 
      ? this.gpu.renderer.match(/ANGLE \(.*?, (.*?) Direct3D/)?.[1] || this.gpu.renderer
      : this.gpu.renderer;
    
    // WebGL spoof applied
  }
}

export { WebGLSpoof };