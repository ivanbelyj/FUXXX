// Messenger — реалтайм через Server-Sent Events (SSE).
// Никаких WebSocket-зависимостей: обычный HTTP, который переиспользуют прокси.
const rooms = new Map(); // roomId -> Set<{ res, clientId }>

export function subscribe(roomId, res, clientId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const set = rooms.get(roomId);
  const peer = { res, clientId };
  set.add(peer);

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no', // nginx: не буферизовать SSE
  });
  res.write(': connected\n\n');

  // Пинги, чтобы соединение не «умирало» молча.
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* сокет закрыт */ }
  }, 25_000);

  presence(roomId);

  return function unsubscribe() {
    clearInterval(ping);
    set.delete(peer);
    if (set.size === 0) rooms.delete(roomId);
    else presence(roomId);
  };
}

export function broadcast(roomId, event, data) {
  const set = rooms.get(roomId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const peer of set) {
    try { peer.res.write(payload); } catch { /* сокет закрыт */ }
  }
}

// Отправить событие одному получателю (используется для персональных ответов).
export function send(res, event, data) {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* ignore */ }
}

// Онлайн считаем по людям, а не по соединениям: у одного человека может быть
// открыто несколько вкладок с одинаковым clientId — это всё ещё один онлайн.
function presence(roomId) {
  const set = rooms.get(roomId);
  const users = new Set();
  if (set) for (const peer of set) users.add(peer.clientId || '?');
  broadcast(roomId, 'presence', { count: users.size });
}
