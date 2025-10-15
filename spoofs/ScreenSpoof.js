/**
 * Подмена разрешения экрана
 */
class ScreenSpoof {
  constructor(resolution) {
    this.resolution = resolution;
  }

  /**
   * Генерирует JavaScript код для подмены экрана
   */
  getInjectionCode() {
    const { width, height } = this.resolution;

    return `
      // ===== SCREEN SPOOFING =====
      Object.defineProperty(window.screen, 'width', {
        get: () => ${width},
        configurable: true
      });
      
      Object.defineProperty(window.screen, 'height', {
        get: () => ${height},
        configurable: true
      });
      
      Object.defineProperty(window.screen, 'availWidth', {
        get: () => ${width},
        configurable: true
      });
      
      Object.defineProperty(window.screen, 'availHeight', {
        get: () => ${height - 40},
        configurable: true
      });
      
      Object.defineProperty(window.screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });
      
      Object.defineProperty(window.screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });
      
      console.log('[ScreenSpoof] ✅ Applied:', ${width}x${height});
    `;
  }

  /**
   * Применяет подмену к странице
   */
  async apply(page) {
    await page.addInitScript(this.getInjectionCode());
    await page.setViewportSize(this.resolution);
    console.log(`📐 Screen: ${this.resolution.width}x${this.resolution.height}`);
  }
}

export { ScreenSpoof };