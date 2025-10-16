/**
 * Подмена языков и локали
 */
class LanguageSpoof {
  constructor(config) {
    this.locale = config.locale;
    this.languages = config.languages;
    this.acceptLanguage = config.acceptLanguage;
  }

  /**
   * Генерирует JavaScript код для подмены языков
   */
  getInjectionCode() {
    const locale = JSON.stringify(this.locale);
    const languages = JSON.stringify(this.languages);

    return `
      // ===== LANGUAGE SPOOFING =====
      Object.defineProperty(navigator, 'language', {
        get: () => ${locale},
        configurable: true
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ${languages},
        configurable: true
      });
      
      // Intl.DateTimeFormat
      const OriginalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args) {
        if (args.length === 0 || args[0] === undefined) {
          args[0] = ${locale};
        }
        return new OriginalDateTimeFormat(...args);
      };
      Object.setPrototypeOf(Intl.DateTimeFormat, OriginalDateTimeFormat);
      Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
      
      // Intl.NumberFormat
      const OriginalNumberFormat = Intl.NumberFormat;
      Intl.NumberFormat = function(...args) {
        if (args.length === 0 || args[0] === undefined) {
          args[0] = ${locale};
        }
        return new OriginalNumberFormat(...args);
      };
      Object.setPrototypeOf(Intl.NumberFormat, OriginalNumberFormat);
      Intl.NumberFormat.prototype = OriginalNumberFormat.prototype;
      
      // Intl.Collator
      const OriginalCollator = Intl.Collator;
      Intl.Collator = function(...args) {
        if (args.length === 0 || args[0] === undefined) {
          args[0] = ${locale};
        }
        return new OriginalCollator(...args);
      };
      Object.setPrototypeOf(Intl.Collator, OriginalCollator);
      Intl.Collator.prototype = OriginalCollator.prototype;
      
      console.log('[LanguageSpoof] ✅ Applied:', '${locale}');
    `;
  }

  /**
   * Применяет подмену к странице
   */
  async apply(page) {
    await page.addInitScript(this.getInjectionCode());
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': this.acceptLanguage
    });
    
    // Language spoof applied
  }
}

export { LanguageSpoof };