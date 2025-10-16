/**
 * Список популярных GPU для подмены (ANGLE формат для Windows)
 */

const GPU_LIST = [
  // NVIDIA RTX 40 Series (новые флагманы)
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 5
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 8
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 12
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 15
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 18
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 20
  },

  // NVIDIA RTX 30 Series (популярные)
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 10
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 12
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 15
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 18
  },

  // NVIDIA GTX Series (бюджетные, очень популярные)
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 25
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Super Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 28
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Super Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 30
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 35
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 32
  },

  // AMD RX 7000 Series (новые)
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 3
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 5
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 7700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 8
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 7600 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 12
  },

  // AMD RX 6000 Series (популярные)
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 8
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 10
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 12
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 15
  },

  // AMD RX 5000 Series (бюджетные)
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 20
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 570 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 18
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 5500 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 15
  },

  // Intel Arc Series (новые)
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel Arc A770 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 5
  },
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel Arc A750 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 8
  },
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel Arc A580 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 10
  },

  // Intel Integrated Graphics (очень популярные для ноутбуков)
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 25
  },
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 35
  },
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 30
  },
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 20
  },

  // AMD Integrated Graphics
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon(TM) Vega 8 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 15
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon(TM) Vega 7 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 12
  }
];

/**
 * Список разрешений экрана (популярные)
 */
const RESOLUTIONS = [
  // Full HD и близкие (самые популярные)
  { width: 1920, height: 1080, weight: 45 },  // Full HD - самое популярное
  { width: 1366, height: 768, weight: 20 },   // HD - бюджетные ноутбуки
  { width: 1536, height: 864, weight: 12 },   // HD+ - популярное на ноутбуках
  { width: 1440, height: 900, weight: 8 },    // WXGA+ - старые ноутбуки
  { width: 1600, height: 900, weight: 6 },    // HD+ - некоторые ноутбуки
  { width: 1280, height: 720, weight: 4 },    // HD - старые устройства

  // 2K и 4K (премиум сегмент)
  { width: 2560, height: 1440, weight: 8 },   // QHD - игровые мониторы
  { width: 3440, height: 1440, weight: 3 },   // UWQHD - ультраширокие
  { width: 3840, height: 2160, weight: 2 },   // 4K UHD - премиум
  { width: 2560, height: 1600, weight: 2 },   // WQXGA - некоторые ноутбуки

  // Нестандартные и редкие
  { width: 1680, height: 1050, weight: 3 },   // WSXGA+ - старые мониторы
  { width: 1920, height: 1200, weight: 2 },   // WUXGA - некоторые мониторы
  { width: 2880, height: 1800, weight: 1 },   // Retina MacBook Pro
  { width: 3200, height: 1800, weight: 1 },   // QHD+ - некоторые ноутбуки
  { width: 1360, height: 768, weight: 2 },    // HD - некоторые устройства
  { width: 1024, height: 768, weight: 1 },    // XGA - старые устройства
  { width: 1280, height: 1024, weight: 1 },   // SXGA - старые мониторы
  { width: 1400, height: 1050, weight: 1 },   // SXGA+ - старые мониторы
  { width: 1600, height: 1200, weight: 1 },   // UXGA - старые мониторы
  { width: 1920, height: 1440, weight: 1 },   // QXGA - старые мониторы
  { width: 2048, height: 1152, weight: 1 },   // QWXGA - редкое
  { width: 2560, height: 1080, weight: 1 },   // UWHD - ультраширокие
  { width: 3840, height: 1080, weight: 1 },   // SUHD - суперширокие
  { width: 5120, height: 1440, weight: 1 }    // 5K ультраширокие - очень редкие
];

/**
 * Конфигурации железа (CPU + RAM)
 */
const HARDWARE_CONFIGS = [
  { cores: 4, memory: 8, weight: 40 },   // Самое популярное
  { cores: 8, memory: 8, weight: 20 },
  { cores: 8, memory: 16, weight: 20 },
  { cores: 4, memory: 4, weight: 10 },   // Бюджетные
  { cores: 16, memory: 16, weight: 10 }  // Мощные
];

/**
 * Генератор локалей из вашей строки
 */
const LOCALE_PATTERNS = [
  "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "ru,ru-RU;q=0.9,en;q=0.8,en-US;q=0.7",
  "ru-RU,en-US;q=0.9,ru;q=0.8,en;q=0.7",
  "ru-RU,ru;q=0.9,en;q=0.8,en-US;q=0.7",
  "ru,en-US;q=0.9,en;q=0.8",
  "ru,ru-RU;q=0.9,en;q=0.8",
  "ru-KZ,ru;q=0.9,kk;q=0.8,en;q=0.7",
  "ru-BY,ru;q=0.9,be;q=0.8,en;q=0.7",
  "ru,kk-KZ;q=0.9,en;q=0.8",
  "ru,be-BY;q=0.9,en;q=0.8"
];

/**
 * Парсит locale pattern в структуру
 */
function parseLocalePattern(pattern) {
  const parts = pattern.split(',');
  const mainLocale = parts[0].trim();
  
  // Извлекаем все языки без весов
  const languages = parts.map(p => p.split(';')[0].trim());
  
  return {
    locale: mainLocale,
    languages: languages,
    acceptLanguage: pattern
  };
}

/**
 * Выбирает случайный элемент с учетом весов
 */
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= (item.weight || 1);
    if (random <= 0) {
      return item;
    }
  }
  
  return items[0];
}

/**
 * Генерирует случайную конфигурацию устройства
 */
export function generateRandomDevice() {
  const gpu = weightedRandom(GPU_LIST);
  const resolution = weightedRandom(RESOLUTIONS);
  const hardware = weightedRandom(HARDWARE_CONFIGS);
  const localePattern = LOCALE_PATTERNS[Math.floor(Math.random() * LOCALE_PATTERNS.length)];
  const localeConfig = parseLocalePattern(localePattern);
  
  // Генерируем seed для WebGL
  const webglSeed = Math.floor(Math.random() * 1000000);
  
  // Определяем категорию устройства для названия
  let deviceName = "Custom PC";
  if (hardware.cores <= 4 && hardware.memory <= 8) {
    deviceName = "Office Laptop";
  } else if (hardware.cores >= 8 && hardware.memory >= 16) {
    deviceName = "Gaming Desktop";
  } else {
    deviceName = "Home PC";
  }
  
  return {
    name: `${deviceName} (${gpu.renderer.match(/NVIDIA|Intel|AMD/)[0]})`,
    category: "generated",
    hardware: {
      cores: hardware.cores,
      memory: hardware.memory
    },
    gpu: {
      vendor: gpu.vendor,
      renderer: gpu.renderer
    },
    resolution: {
      width: resolution.width,
      height: resolution.height
    },
    locale: localeConfig.locale,
    languages: localeConfig.languages,
    acceptLanguage: localeConfig.acceptLanguage,
    webgl: {
      vendor: gpu.vendor,
      renderer: gpu.renderer,
      seed: webglSeed
    }
  };
}

/**
 * Для обратной совместимости - алиас
 */
export function getRandomDevice() {
  return generateRandomDevice();
}

/**
 * Получает статистику по GPU
 */
export function getGPUStats() {
  return {
    total: GPU_LIST.length,
    gpus: GPU_LIST.map(gpu => ({
      vendor: gpu.vendor,
      renderer: gpu.renderer,
      weight: gpu.weight
    }))
  };
}

/**
 * Получает статистику по разрешениям
 */
export function getResolutionStats() {
  return RESOLUTIONS.map(res => ({
    resolution: `${res.width}x${res.height}`,
    weight: res.weight
  }));
}

/**
 * Получает все доступные locale patterns
 */
export function getLocalePatterns() {
  return LOCALE_PATTERNS;
}