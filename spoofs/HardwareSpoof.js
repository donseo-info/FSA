/**
 * Подмена характеристик железа (CPU, RAM)
 */
class HardwareSpoof {
  constructor(hardware) {
    this.cores = hardware.cores;
    this.memory = hardware.memory;
  }

  /**
   * Генерирует JavaScript код для подмены железа
   */
  getInjectionCode() {
    const cores = this.cores;
    const memory = this.memory;

    return `
      // ===== HARDWARE SPOOFING =====
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => ${cores},
        configurable: true
      });
      
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => ${memory},
        configurable: true
      });
      
      // performance.memory
      if (performance.memory) {
        const memoryInBytes = ${memory} * 1024 * 1024 * 1024;
        const heapLimit = Math.floor(memoryInBytes * 0.5);
        
        Object.defineProperty(performance.memory, 'jsHeapSizeLimit', {
          get: () => heapLimit,
          configurable: true
        });
        
        Object.defineProperty(performance.memory, 'totalJSHeapSize', {
          get: () => Math.floor(heapLimit * 0.8),
          configurable: true
        });
        
        Object.defineProperty(performance.memory, 'usedJSHeapSize', {
          get: () => Math.floor(heapLimit * 0.56),
          configurable: true
        });
      }
      
      console.log('[HardwareSpoof] ✅ Applied: ${cores} cores, ${memory} GB');
    `;
  }

  /**
   * Применяет подмену к странице
   */
  async apply(page) {
    await page.addInitScript(this.getInjectionCode());
    console.log(`💻 Hardware: ${this.cores} cores, ${this.memory} GB`);
  }
}

export { HardwareSpoof };