export function isEqual(value: any, other: any) {
  // Если оба значения одинаковы (включая примитивы и ссылки на один объект)
  if (value === other) {
    return true;
  }

  // Если одно из значений null или не объект, и они не равны (уже проверено выше)
  if (value === null || other === null || typeof value !== 'object' || typeof other !== 'object') {
    return false;
  }

  // Если один из аргументов — Date, сравниваем их временные метки
  if (value instanceof Date && other instanceof Date) {
    return value.getTime() === other.getTime();
  }

  // Если один из аргументов — RegExp, сравниваем их строковые представления
  if (value instanceof RegExp && other instanceof RegExp) {
    return value.toString() === other.toString();
  }

  // Если один из аргументов — Map, преобразуем их в массивы и сравниваем
  if (value instanceof Map && other instanceof Map) {
    if (value.size !== other.size) return false;
    for (const [key, val] of value) {
      if (!other.has(key) || !isEqual(val, other.get(key))) {
        return false;
      }
    }
    return true;
  }

  // Если один из аргументов — Set, преобразуем их в массивы и сравниваем
  if (value instanceof Set && other instanceof Set) {
    if (value.size !== other.size) return false;
    for (const val of value) {
      if (!other.has(val)) {
        return false;
      }
    }
    return true;
  }

  // Если это массивы, сравниваем их длины и элементы
  if (Array.isArray(value) && Array.isArray(other)) {
    if (value.length !== other.length) return false;
    for (let i = 0; i < value.length; i++) {
      if (!isEqual(value[i], other[i])) {
        return false;
      }
    }
    return true;
  }

  // Если это объекты, сравниваем их ключи и значения
  const valueKeys = Object.keys(value);
  const otherKeys = Object.keys(other);

  // Если количество ключей разное, объекты не равны
  if (valueKeys.length !== otherKeys.length) {
    return false;
  }

  // Рекурсивно сравниваем все свойства
  for (const key of valueKeys) {
    if (!Object.hasOwnProperty.call(other, key) || !isEqual(value[key], other[key])) {
      return false;
    }
  }

  return true;
}