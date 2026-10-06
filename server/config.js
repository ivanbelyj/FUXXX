// Messenger — конфигурация сервера.
// Всё настраивается переменными окружения и читается один раз при старте.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
fs.mkdirSync(path.join(dataDir, 'rooms'), { recursive: true });

// Секрет сервера: генерируем один раз и сохраняем, чтобы ссылки-приглашения
// оставались валидными после перезапуска сервера.
function loadSecret() {
  if (process.env.SECRET) return process.env.SECRET;
  const file = path.join(dataDir, 'secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const s = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, s, { mode: 0o600 });
    return s;
  }
}

const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);
const list = (v, d) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d);

export const config = {
  root,
  dataDir,
  port: num(process.env.PORT, 8787),
  host: process.env.HOST || '0.0.0.0',
  secret: loadSecret(),

  // Лимиты: защита от абьюза недобросовестных пользователей.
  limits: {
    maxMessageChars: num(process.env.MAX_MESSAGE_CHARS, 4000),
    maxBodyBytes: num(process.env.MAX_BODY_BYTES, 16 * 1024 * 1024),
    maxMediaBytes: num(process.env.MAX_MEDIA_BYTES, 8 * 1024 * 1024),
    msgsPerMinute: num(process.env.MSGS_PER_MINUTE, 60),
    roomBudgetBytes: num(process.env.ROOM_BUDGET_BYTES, 48 * 1024 * 1024),
    historyLimit: num(process.env.HISTORY_LIMIT, 500),
    aiPerHour: num(process.env.AI_PER_HOUR, 30),
  },

  // OpenAI-совместимый провайдер (по умолчанию DeepSeek). Ключ НЕ уходит клиенту.
  ai: {
    baseUrl: (process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, ''),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'deepseek-chat',
    maxTokens: num(process.env.AI_MAX_TOKENS, 700),
    temperature: num(process.env.AI_TEMPERATURE, 0.7),
    system: process.env.AI_SYSTEM ||
      'Ты — собеседник в минималистичном мессенджере. Отвечай кратко, дружелюбно и по делу.',
    contextMessages: num(process.env.AI_CONTEXT_MESSAGES, 12),
  },

  // Белый список доменов для превью ссылок.
  previewWhitelist: list(process.env.PREVIEW_WHITELIST, [
    'youtube.com', 'youtu.be', 'github.com', 't.me', 'telegram.me', 'vk.com', 'max.ru',
  ]),
};
