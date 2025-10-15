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
            
            // Добавляем шум к каждому 100-му пикселю
            if (pixels && pixels.length) {
              for (let i = 0; i < pixels.length; i += 100) {
                const noise = Math.floor(generateNoise() * 255);
                pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise));
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
    
    console.log(`🎮 WebGL: ${shortName}`);
  }
}

export { WebGLSpoof };