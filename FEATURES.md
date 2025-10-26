# 🎯 Функциональность системы профилей

## 📊 Система учета посещенных доменов и тегов

### **Новые поля в профилях**

Каждый профиль теперь содержит:

```json
{
  "name": "bot-123456",
  "visitedDomains": [],     // Массив доменов, которые профиль уже посещал
  "tags": []                 // Массив меток (тегов) для фильтрации
}
```

---

## 🎯 Доступные методы ProfileGenerator

### **1. addVisitedDomain(profileName, domain)**

Добавляет домен в список посещенных доменов профиля.

**Параметры:**
- `profileName` (string) - имя профиля
- `domain` (string) - домен для добавления

**Пример:**
```javascript
const generator = new ProfileGenerator({ chromePaths });

// Добавляем домен, который профиль посетил
generator.addVisitedDomain('bot-123', 'sberbank.ru');
```

---

### **2. addTag(profileName, tag)**

Добавляет тег к профилю для фильтрации.

**Параметры:**
- `profileName` (string) - имя профиля
- `tag` (string) - тег для добавления

**Пример:**
```javascript
// Добавляем тег
generator.addTag('bot-123', 'bank');
generator.addTag('bot-123', 'finance');
```

---

### **3. getProfilesNotVisitedDomain(domain)**

Возвращает список профилей, которые **еще не посещали** указанный домен.

**Параметры:**
- `domain` (string) - домен для проверки

**Возвращает:**
- `Array` - массив объектов профилей

**Пример:**
```javascript
// Получаем профили, которые еще не посещали sberbank.ru
const profiles = generator.getProfilesNotVisitedDomain('sberbank.ru');

console.log(`Найдено ${profiles.length} профилей без сбербанка`);
// Найдено 25 профилей без сбербанка
```

---

### **4. getProfilesWithTag(tag)**

Возвращает список профилей с указанным тегом.

**Параметры:**
- `tag` (string) - тег для поиска

**Возвращает:**
- `Array` - массив объектов профилей

**Пример:**
```javascript
// Получаем все профили с тегом 'bank'
const bankProfiles = generator.getProfilesWithTag('bank');

console.log(`Найдено ${bankProfiles.length} профилей с тегом 'bank'`);
// Найдено 5 профилей с тегом 'bank'
```

---

## 🎯 Примеры использования

### **Сценарий 1: Выборка профилей для посещения нового домена**

```javascript
const generator = new ProfileGenerator({ chromePaths });

// Получаем профили, которые еще не посещали sberbank.ru
const availableProfiles = generator.getProfilesNotVisitedDomain('sberbank.ru');

if (availableProfiles.length === 0) {
  console.log('❌ Все профили уже посещали sberbank.ru');
} else {
  // Выбираем случайный профиль
  const randomProfile = availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
  
  console.log(`✅ Выбран профиль: ${randomProfile.name}`);
  
  // После посещения добавляем домен
  generator.addVisitedDomain(randomProfile.name, 'sberbank.ru');
}
```

---

### **Сценарий 2: Фильтрация по тегам**

```javascript
const generator = new ProfileGenerator({ chromePaths });

// Добавляем теги к профилям
generator.addTag('bot-123', 'premium');
generator.addTag('bot-456', 'premium');
generator.addTag('bot-789', 'standard');

// Получаем только премиум профили
const premiumProfiles = generator.getProfilesWithTag('premium');
console.log(`Найдено ${premiumProfiles.length} премиум профилей`);
// Найдено 2 премиум профилей
```

---

### **Сценарий 3: Комбинированный поиск**

```javascript
const generator = new ProfileGenerator({ chromePaths });

// 1. Получаем профили, которые еще не посещали banki.ru
const profiles = generator.getProfilesNotVisitedDomain('banki.ru');

// 2. Фильтруем только с тегом 'premium'
const premiumAvailable = profiles.filter(p => 
  (p.tags || []).includes('premium')
);

console.log(`Найдено ${premiumAvailable.length} премиум профилей без banki.ru`);
```

---

## 🔄 Автоматическая инициализация

Для старых профилей поля автоматически инициализируются при первом обращении:

```javascript
// Старый профиль без visitedDomains
const profile = generator.getProfileConfig('bot-old');

// При добавлении домена автоматически создастся массив
generator.addVisitedDomain('bot-old', 'example.com');
// Теперь visitedDomains: ['example.com']
```

---

## 📊 Структура metadata.json

```json
{
  "profiles": {
    "bot-123": {
      "name": "bot-123",
      "deviceName": "Gaming Desktop",
      "resolution": { "width": 1920, "height": 1080 },
      "visitedDomains": [
        "sberbank.ru",
        "banki.ru",
        "tinkoff.ru"
      ],
      "tags": [
        "bank",
        "premium"
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastUsed": "Mon Jan 15 2024 13:45:30 GMT+0300",
      ...
    }
  }
}
```

---

## 🔥 Продвинутая фильтрация профилей

### **Комбинированные фильтры**

Теперь можно применять **несколько фильтров одновременно** с помощью метода `getFilteredProfiles()` или `selectProfile()`.

---

### **📊 Метод `getFilteredProfiles(filters)`**

Возвращает массив профилей, соответствующих всем заданным фильтрам.

**Параметры фильтров:**

```javascript
filters = {
  // Фильтр по тегу
  tag: 'premium',
  
  // Исключить профили, которые уже посещали домен
  notVisitedDomain: 'sberbank.ru',
  
  // Фильтр по количеству доменов в cookies
  domainsCount: { 
    operator: '>',  // '>' или '<'
    count: 50       // количество доменов
  },
  
  // Фильтр по дате создания профиля
  createdAt: { 
    operator: '<',  // '>' (старше) или '<' (младше)
    days: 2         // количество дней
  },
  
  // Фильтр по cooldown (время последнего использования)
  cooldownMinutes: 60  // минуты с последнего использования
}
```

**Пример:**

```javascript
const generator = new ProfileGenerator({ chromePaths });

// Получаем профили: с тегом 'bank', меньше 50 доменов, созданные менее 2 дней назад
const filteredProfiles = generator.getFilteredProfiles({
  tag: 'bank',
  domainsCount: { operator: '<', count: 50 },
  createdAt: { operator: '<', days: 2 }
});

console.log(`Найдено ${filteredProfiles.length} подходящих профилей`);
```

---

### **🎯 Метод `selectProfile(options)`**

Выбирает **один лучший профиль** на основе фильтров и сортировки.

**Параметры:**

```javascript
options = {
  filters: {
    // Все фильтры из getFilteredProfiles()
    tag: 'premium',
    domainsCount: { operator: '<', count: 50 },
    // и т.д.
  },
  
  sortBy: 'lastUsed',     // По какому полю сортировать: 'lastUsed' | 'createdAt'
  sortOrder: 'asc'        // Порядок: 'asc' (по возрастанию) | 'desc' (по убыванию)
}
```

**Пример использования:**

```javascript
const generator = new ProfileGenerator({ chromePaths });

// Выбираем профиль: младше 2 дней, меньше 50 доменов, с самой старой работой
const selectedProfile = generator.selectProfile({
  filters: {
    createdAt: { operator: '<', days: 2 },
    domainsCount: { operator: '<', count: 50 }
  },
  sortBy: 'lastUsed',
  sortOrder: 'asc'  // asc = самый старый (раньше использовался)
});

if (selectedProfile) {
  console.log(`Выбран профиль: ${selectedProfile.name}`);
} else {
  console.log('Нет подходящих профилей');
}
```

---

### **📋 Варианты сортировки**

#### **1. По времени последнего использования (`lastUsed`)**

```javascript
// Самый старый (дольше не работал)
sortBy: 'lastUsed',
sortOrder: 'asc'

// Самый свежий (недавно работал)
sortBy: 'lastUsed',
sortOrder: 'desc'
```

#### **2. По дате создания (`createdAt`)**

```javascript
// Самый старый профиль (создан раньше)
sortBy: 'createdAt',
sortOrder: 'asc'

// Самый новый профиль (создан недавно)
sortBy: 'createdAt',
sortOrder: 'desc'
```

---

### **🎯 Примеры комбинированных запросов**

#### **Пример 1: Молодые профили с малым количеством доменов**

```javascript
const profile = generator.selectProfile({
  filters: {
    createdAt: { operator: '<', days: 3 },      // Создан менее 3 дней назад
    domainsCount: { operator: '<', count: 10 }  // Меньше 10 доменов
  },
  sortBy: 'lastUsed',
  sortOrder: 'asc'  // Самый давно не работавший
});
```

#### **Пример 2: Опытные профили для премиум задач**

```javascript
const profile = generator.selectProfile({
  filters: {
    tag: 'premium',                                // С тегом 'premium'
    domainsCount: { operator: '>', count: 100 },   // Больше 100 доменов
    createdAt: { operator: '>', days: 30 },       // Старше 30 дней
    cooldownMinutes: 120                          // Прошло 2 часа cooldown
  },
  sortBy: 'lastUsed',
  sortOrder: 'asc'  // Давно не работал
});
```

#### **Пример 3: Профили для нового домена**

```javascript
const profile = generator.selectProfile({
  filters: {
    notVisitedDomain: 'banki.ru',              // Еще не посещали banki.ru
    domainsCount: { operator: '>', count: 20 } // Опытный (больше 20 доменов)
  },
  sortBy: 'lastUsed',
  sortOrder: 'asc'  // Самый неактивный
});
```

#### **Пример 4: Свежие чистые профили**

```javascript
const profiles = generator.getFilteredProfiles({
  createdAt: { operator: '<', days: 1 },       // Создан сегодня
  domainsCount: { operator: '<', count: 5 },    // Мало доменов
  cooldownMinutes: 0                            // Не важно когда работал
});

console.log(`Найдено ${profiles.length} свежих профилей`);
```

---

### **📊 Операторы фильтрации**

#### **Фильтр по количеству доменов**

| Оператор | Описание | Пример |
|----------|----------|--------|
| `>` | Больше | `{ operator: '>', count: 50 }` - больше 50 доменов |
| `<` | Меньше | `{ operator: '<', count: 50 }` - меньше 50 доменов |

#### **Фильтр по дате создания**

| Оператор | Описание | Пример |
|----------|----------|--------|
| `>` | Старше | `{ operator: '>', days: 7 }` - старше 7 дней |
| `<` | Младше | `{ operator: '<', days: 7 }` - младше 7 дней |

---

### **🔄 Логика фильтрации**

1. **Все фильтры применяются одновременно** (логическое И)
2. **Порядок сортировки:** сначала фильтрация, потом сортировка
3. **Если профиль не подходит по любому критерию** - исключается
4. **При `selectProfile()`** возвращается первый элемент из отсортированного списка

---

## ✅ Преимущества системы

1. **Отслеживание посещений** - знаем, какие домены профиль уже посещал
2. **Гибкая фильтрация** - выборка профилей по доменам и тегам
3. **Комбинированные фильтры** - применяем несколько условий одновременно
4. **Умная сортировка** - выбираем лучший профиль для задачи
5. **Предотвращение дублей** - автоматически исключаем уже посещенные домены
6. **Теги** - организация и категоризация профилей
7. **Автоматическая инициализация** - совместимость со старыми профилями

