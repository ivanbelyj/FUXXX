// Messenger — хранилище комнат.
// Одна комната = один append-only журнал (JSONL) + файл метаданных.
// Сервер хранит только текст и метаданные сообщений. Тела медиа НЕ хранятся.
// Бюджет на размер комнаты: при переполнении отбрасываем самые старые сообщения.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { uid } from './util.js';

const roomsDir = path.join(config.dataDir, 'rooms');
const cache = new Map(); // roomId -> { messages: [], bytes, meta }

const logPath = (roomId) => path.join(roomsDir, roomId + '.jsonl');
const metaPath = (roomId) => path.join(roomsDir, roomId + '.meta.json');
const sizeOf = (m) => JSON.stringify(m).length;

function load(roomId) {
  if (cache.has(roomId)) return cache.get(roomId);
  const entry = { messages: [], bytes: 0, meta: null };
  try {
    entry.meta = JSON.parse(fs.readFileSync(metaPath(roomId), 'utf8'));
  } catch {
    entry.meta = null;
  }
  try {
    const raw = fs.readFileSync(logPath(roomId), 'utf8');
    for (const line of raw.split('\n')) {
      if (!line) continue;
      try { entry.messages.push(JSON.parse(line)); } catch { /* битая строка — пропускаем */ }
    }
  } catch { /* комнаты ещё нет */ }
  entry.bytes = entry.messages.reduce((n, m) => n + sizeOf(m), 0);
  cache.set(roomId, entry);
  return entry;
}

export function roomExists(roomId) {
  return Boolean(roomId) && (fs.existsSync(logPath(roomId)) || fs.existsSync(metaPath(roomId)));
}

export function createRoom(name, ownerId) {
  const id = uid(9); // ~12 символов. Неугадываемый идентификатор = «ключ доступа».
  const meta = {
    id,
    name: String(name || 'Комната').slice(0, 80),
    createdAt: Date.now(),
    ownerId: ownerId || null,
  };
  fs.writeFileSync(metaPath(id), JSON.stringify(meta));
  fs.writeFileSync(logPath(id), '');
  cache.set(id, { messages: [], bytes: 0, meta });
  return meta;
}

export function getRoomMeta(roomId) {
  const entry = load(roomId);
  return entry.meta;
}

export function getMessages(roomId, limit = config.limits.historyLimit) {
  const entry = load(roomId);
  return entry.messages.slice(-limit);
}

// Сколько сообщений пришло после отметки `ts` (для счётчиков непрочитанного).
// Считаем на сервере, чтобы экран входа не тянул историю каждой комнаты целиком.
export function countSince(roomId, ts, excludeId) {
  const entry = load(roomId);
  let count = 0;
  for (let i = entry.messages.length - 1; i >= 0; i--) {
    const m = entry.messages[i];
    if (m.ts <= ts) break; // журнал append-only, время не убывает
    if (excludeId && m.authorId === excludeId) continue; // свои сообщения не считаем
    count += 1;
  }
  return count;
}

// Состав участников комнаты: уникальные подписи авторов (бота не считаем),
// последние активные — в конце. Нужен экрану входа: вместо выдуманного
// «квадратика» показываем реальных людей, которые писали в комнату.
export function peopleOf(roomId, limit = 6) {
  const entry = load(roomId);
  const byAuthor = new Map(); // authorId -> последняя подпись
  for (const m of entry.messages) {
    if (m.bot || !m.authorId) continue;
    byAuthor.set(m.authorId, m.author);
  }
  return [...byAuthor.values()].slice(-limit);
}

// Переименование переписывает и прошлые сообщения: подпись у человека одна на
// всю историю, поэтому «притвориться двумя людьми» не получится.
export function renameAuthor(roomId, authorId, author) {
  const entry = load(roomId);
  let changed = 0;
  for (const m of entry.messages) {
    if (m.authorId !== authorId || m.author === author) continue;
    entry.bytes += sizeOf(author) - sizeOf(m.author);
    m.author = author;
    changed += 1;
  }
  if (changed) fs.writeFileSync(logPath(roomId), entry.messages.map((m) => JSON.stringify(m)).join('\n') + '\n');
  return changed;
}

export function appendMessage(roomId, msg) {
  const entry = load(roomId);
  entry.messages.push(msg);
  entry.bytes += sizeOf(msg);
  fs.appendFileSync(logPath(roomId), JSON.stringify(msg) + '\n');
  if (entry.bytes > config.limits.roomBudgetBytes) prune(roomId, entry);
  return msg;
}

// Прунинг: тела медиа на сервере не хранятся, поэтому при переполнении бюджета
// отбрасываем самые старые сообщения (защита от абьюза и роста данных).
function prune(roomId, entry) {
  while (entry.bytes > config.limits.roomBudgetBytes && entry.messages.length > 1) {
    entry.bytes -= sizeOf(entry.messages.shift());
  }
  fs.writeFileSync(logPath(roomId), entry.messages.map((m) => JSON.stringify(m)).join('\n') + '\n');
}

export function stats() {
  let rooms = 0;
  let bytes = 0;
  try {
    for (const f of fs.readdirSync(roomsDir)) {
      if (!f.endsWith('.meta.json')) continue;
      const id = f.replace('.meta.json', '');
      rooms += 1;
      bytes += load(id).bytes;
    }
  } catch { /* нет данных */ }
  return { rooms, bytes };
}
