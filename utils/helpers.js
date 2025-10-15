/**
 * Вспомогательные функции
 */

/**
 * Генерирует случайное 9-значное число
 */
export function generateRandomId() {
  return Math.floor(100000000 + Math.random() * 900000000);
}

/**
 * Форматирует дату для вывода
 */
export function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Ждет указанное количество миллисекунд
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Проверяет что строка является IP адресом
 */
export function isValidIP(str) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str);
}