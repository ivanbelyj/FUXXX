// Messenger — HTTP-сервер. Чистый node:http, ноль зависимостей.
// Роутинг намеренно простой: если человек читает этот файл, он должен всё понять.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { json, readBody, uid, rateLimiter, hourlyLimiter, clientIp } from './util.js';
import * as store from './storage.js';
import * as rt from './realtime.js';
import { preview } from './preview.js';
import { askAI, aiReady } from './ai.js';

const publicDir = path.join(config.root, 'public');
const canSend = rateLimiter(config.limits.msgsPerMinute);
const canAI = hourlyLimiter(config.limits.aiPerHour);
const aiBusy = new Set(); // комнаты, где сейчас генерится ответ ИИ

// Безопасность с первого дня: строгие заголовки на каждый ответ.
const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'geolocation=(), microphone=(), camera=()',
  'content-security-policy': [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '),
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

// --- Валидация входящих сообщений (защита от абьюза) ---
function sanitizeMedia(media) {
  if (!media || typeof media !== 'object') return null;
  const dataUrl = typeof media.dataUrl === 'string' ? media.dataUrl : '';
  if (!/^data:(image|video)\/[a-z0-9.+-]+;base64,/i.test(dataUrl)) return null;
  if (dataUrl.length > config.limits.maxMediaBytes * 1.4) return null; // base64 ≈ +33%
  return {
    id: uid(6),
    kind: dataUrl.startsWith('data:video') ? 'video' : 'image',
    name: String(media.name || 'file').slice(0, 120),
    type: String(media.type || '').slice(0, 60),
    size: Number(media.size) || 0,
    dataUrl, // нужен для живого показа участникам; в журнал комнаты не пишется
  };
}

const clean = (s, n) => String(s == null ? '' : s).slice(0, n);

// --- Раздача статики (фронтенд) ---
function serveStatic(res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  // Ссылка-приглашение /j/<roomId> показывает тот же SPA.
  if (rel.startsWith('/j/')) rel = '/index.html';
  try { rel = decodeURIComponent(rel); } catch { /* как есть */ }
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // Любой неизвестный путь — это тоже SPA (роутинг на клиенте).
      fs.readFile(path.join(publicDir, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': MIME['.html'] });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(buf);
  });
}

// --- Роутер ---
async function handle(req, res) {
  for (const [k, v] of Object.entries(securityHeaders)) res.setHeader(k, v);

  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const ip = clientIp(req);

  // Здоровье / возможности сервера.
  if (p === '/api/health') {
    return json(res, 200, {
      ok: true,
      ai: aiReady(),
      preview: config.previewWhitelist,
      limits: {
        maxMessageChars: config.limits.maxMessageChars,
        maxMediaBytes: config.limits.maxMediaBytes,
      },
      ...store.stats(),
    });
  }

  // Создать комнату и получить ссылку-приглашение.
  if (p === '/api/rooms' && req.method === 'POST') {
    if (!canSend('create:' + ip)) return json(res, 429, { error: 'slow down' });
    const body = JSON.parse(await readBody(req, 64 * 1024));
    const meta = store.createRoom(clean(body.name, 80), clean(body.clientId, 64));
    return json(res, 200, meta);
  }

  // Всё остальное привязано к комнате: /api/rooms/:id/...
  const m = p.match(/^\/api\/rooms\/([A-Za-z0-9_-]{4,64})(\/.*)?$/);
  if (m) return handleRoom(req, res, url, m[1], m[2] || '', ip);

  // Превью ссылок.
  if (p === '/api/preview') {
    if (!canSend('preview:' + ip)) return json(res, 429, { error: 'slow down' });
    return json(res, 200, await preview(url.searchParams.get('url') || ''));
  }

  if (p.startsWith('/api/')) return json(res, 404, { error: 'not found' });

  return serveStatic(res, p);
}

async function handleRoom(req, res, url, roomId, sub, ip) {
  if (!store.roomExists(roomId)) return json(res, 404, { error: 'no such room' });

  // Метаданные комнаты (имя и т.п.).
  if (sub === '' && req.method === 'GET') return json(res, 200, store.getRoomMeta(roomId));

  // История сообщений.
  if (sub === '/messages' && req.method === 'GET') {
    const limit = Math.min(Number(url.searchParams.get('limit')) || config.limits.historyLimit, 1000);
    return json(res, 200, { messages: store.getMessages(roomId, limit) });
  }

  // Реалтайм-поток (SSE).
  if (sub === '/events' && req.method === 'GET') {
    const clientId = clean(url.searchParams.get('clientId'), 64);
    req.on('close', rt.subscribe(roomId, res, clientId));
    return;
  }

  // Индикатор «печатает…» (эфемерно, не хранится).
  if (sub === '/typing' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req, 4096));
    rt.broadcast(roomId, 'typing', { author: clean(body.author, 32), clientId: clean(body.clientId, 64) });
    return json(res, 200, { ok: true });
  }

  // Непрочитанное: сколько сообщений пришло в комнату позже отметки `since`.
  // Считается на сервере, чтобы список чатов не тянул историю целиком.
  if (sub === '/unread' && req.method === 'GET') {
    const since = Number(url.searchParams.get('since')) || 0;
    const exclude = clean(url.searchParams.get('exclude'), 64);
    return json(res, 200, {
      count: store.countSince(roomId, since, exclude),
      people: store.peopleOf(roomId),
    });
  }

  // Аватар: сервер его НЕ хранит — картинка передаётся в реальном времени тем,
  // кто сейчас в комнате, и остаётся только в браузерах участников.
  if (sub === '/avatar' && req.method === 'POST') {
    if (!canSend('avatar:' + ip)) return json(res, 429, { error: 'slow down' });
    const body = JSON.parse(await readBody(req, 64 * 1024));
    const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
      return json(res, 400, { error: 'bad avatar' });
    }
    if (dataUrl.length > 48 * 1024) return json(res, 413, { error: 'avatar too large' });
    rt.broadcast(roomId, 'avatar', {
      authorId: clean(body.clientId, 64) || 'anon',
      author: clean(body.author, 32),
      dataUrl,
    });
    return json(res, 200, { ok: true });
  }

  // Смена имени. Имя — это подпись, а не аккаунт, зато подпись одна на всю
  // историю: сервер переписывает прошлые сообщения этого клиента. Поэтому
  // разослать сообщения от разных имён (и «притвориться» двумя людьми) нельзя.
  if (sub === '/rename' && req.method === 'POST') {
    if (!canSend('rename:' + ip)) return json(res, 429, { error: 'slow down' });
    const body = JSON.parse(await readBody(req, 4096));
    const author = clean(body.author, 32).trim();
    if (!author) return json(res, 400, { error: 'empty name' });
    const clientId = clean(body.clientId, 64) || 'anon';
    const changed = store.renameAuthor(roomId, clientId, author);
    rt.broadcast(roomId, 'rename', { clientId, author });
    return json(res, 200, { ok: true, changed });
  }

  // Отправить сообщение.
  if (sub === '/messages' && req.method === 'POST') {
    if (!canSend(roomId + ':' + ip)) return json(res, 429, { error: 'too many messages' });
    return postMessage(req, res, roomId);
  }

  // Явно попросить ИИ ответить.
  if (sub === '/ai' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req, 64 * 1024));
    runAI(roomId, clean(body.text, config.limits.maxMessageChars), ip);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'not found' });
}

async function postMessage(req, res, roomId) {
  const body = JSON.parse(await readBody(req, config.limits.maxBodyBytes));
  const text = clean(body.text, config.limits.maxMessageChars).trim();
  const media = sanitizeMedia(body.media);
  if (!text && !media) return json(res, 400, { error: 'empty message' });

  const msg = {
    id: uid(6),
    author: clean(body.author, 32) || 'anon',
    authorId: clean(body.clientId, 64) || 'anon',
    bot: false,
    text,
    media,
    ts: Date.now(),
  };

  // Тела медиа не хранятся на сервере: в журнал пишем только метаданные,
  // а участникам комнаты файл уходит в реальном времени (см. rt.broadcast ниже).
  const stored = media ? { ...msg, media: { ...media, dataUrl: null } } : msg;

  store.appendMessage(roomId, stored);
  rt.broadcast(roomId, 'message', msg);

  // AI-native: упоминание @ai или /ai запускает ответ ассистента в комнате.
  if (aiReady() && /(^|\s)[@/]ai\b/i.test(text)) runAI(roomId, '', clientIp(req));

  return json(res, 200, { ok: true, id: msg.id });
}

// Фоновый запуск ответа ИИ: токены уходят всем участникам комнаты (SSE),
// по завершении полный ответ сохраняется как сообщение от бота.
async function runAI(roomId, prompt, ip) {
  if (aiBusy.has(roomId)) return;
  if (!aiReady()) { rt.broadcast(roomId, 'ai:error', { message: 'ИИ не настроен на сервере' }); return; }
  if (!canAI('ai:' + ip)) { rt.broadcast(roomId, 'ai:error', { message: 'Лимит ИИ исчерпан, попробуй позже' }); return; }

  aiBusy.add(roomId);
  try {
    rt.broadcast(roomId, 'ai:start', { model: config.ai.model });
    const history = store.getMessages(roomId, config.ai.contextMessages);
    const answer = await askAI({
      history,
      prompt,
      onToken: (t) => rt.broadcast(roomId, 'ai:token', { text: t }),
    });
    const msg = {
      id: uid(6), author: 'AI', authorId: 'ai', bot: true,
      text: answer || '…', media: null, ts: Date.now(),
    };
    store.appendMessage(roomId, msg);
    rt.broadcast(roomId, 'ai:end', {});
    rt.broadcast(roomId, 'message', msg);
  } catch (e) {
    rt.broadcast(roomId, 'ai:error', { message: String(e.message || e).slice(0, 240) });
  } finally {
    aiBusy.delete(roomId);
  }
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    if (!res.headersSent) json(res, 500, { error: 'server error' });
    else res.end();
  });
});

server.listen(config.port, config.host, () => {
  const { rooms, bytes } = store.stats();
  console.log(`Messenger: http://${config.host}:${config.port}`);
  console.log(`AI: ${aiReady() ? config.ai.model + ' @ ' + config.ai.baseUrl : 'не настроен (AI_API_KEY пуст)'}`);
  console.log('Медиа: только в реальном времени (на сервере не хранится)');
  console.log(`Комнат: ${rooms}, данных: ${(bytes / 1024).toFixed(1)} КБ`);
});
