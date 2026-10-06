// Messenger — маленькие утилиты. Без зависимостей.
// Здесь только то, что реально нужно: id, ответы, чтение тела, лимиты.
import crypto from 'node:crypto';

export const uid = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');

// Максимально простые и понятные ответы.
export function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

// Читаем тело запроса с жёстким ограничением размера (защита от абьюза).
export function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Простой счётчик "N запросов в минуту" на ключ (IP / клиент).
export function rateLimiter(perMinute) {
  const buckets = new Map();
  return (key) => {
    const t = Date.now();
    const b = buckets.get(key) || { start: t, count: 0 };
    if (t - b.start > 60_000) {
      b.start = t;
      b.count = 0;
    }
    b.count += 1;
    buckets.set(key, b);
    if (buckets.size > 10_000) buckets.clear(); // защита от роста памяти
    return b.count <= perMinute;
  };
}

// Лимит "N раз в час" (используется для AI — «DeepSeek за доллар»).
export function hourlyLimiter(perHour) {
  const buckets = new Map();
  return (key) => {
    const t = Date.now();
    const b = buckets.get(key) || { start: t, count: 0 };
    if (t - b.start > 3_600_000) {
      b.start = t;
      b.count = 0;
    }
    b.count += 1;
    buckets.set(key, b);
    return b.count <= perHour;
  };
}

// Хвост IP для ключей лимитов (не храним полный адрес).
export function clientIp(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'ip';
}
