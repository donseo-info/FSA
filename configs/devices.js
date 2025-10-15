/**
 * Список популярных GPU для подмены (ANGLE формат для Windows)
 */

const GPU_LIST = [
  // NVIDIA Mid-range (самая популярная)
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 40
  },
  
  // Intel Integrated (очень популярная для ноутбуков)
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 35
  },
  
  // AMD Mid-range
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)",
    weight: 25
  }
];

/**
 * Список разрешений экрана (популярные)
 */
const RESOLUTIONS = [
  { width: 1920, height: 1080, weight: 50 },  // Full HD - самое популярное
  { width: 1366, height: 768, weight: 25 },   // HD - бюджетные ноутбуки
  { width: 1440, height: 900, weight: 10 },
  { width: 1536, height: 864, weight: 10 },
  { width: 2560, height: 1440, weight: 5 }    // QHD - редкое
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