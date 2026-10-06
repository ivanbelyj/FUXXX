// Messenger — фронтенд. Чистый JS-модуль, ноль зависимостей.
// Принцип: чем проще — тем лучше. Одна функция делает одну вещь.

// ---------- Помощники ----------
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));

// ---------- Локализация (i18n) ----------
// Плоские ключи: так правки не ломают структуру. RU — основной, EN — фолбэк.
const I18N = {
  ru: {
    appTitle: 'Мессенджер FUXXX',
    namePlaceholder: 'твое имя?',
    create: 'Создать чат',
    myChats: 'Чаты',
    remove: 'Убрать',
    forget: 'Забыть',
    theme: 'Тема',
    style: 'Стиль',
    language: 'Язык',
    avatar: 'Аватар',
    avatarPick: 'Выбрать аватар',
    toastAvatarSaved: 'Аватар обновлён',
    toastAvatarBig: 'Картинка слишком большая',
    toastAvatarBad: 'Не получилось поставить аватар',
    back: 'Назад',
    share: 'Пригласить',
    attach: 'Прикрепить',
    send: 'Отправить',
    composerPlaceholder: 'Сообщение…  (@ai чтобы позвать ИИ)',
    chatFallback: 'Чат',
    roomSuffix: ' · чат',
    presenceOnline: '{n} онлайн',
    typing: '{author} печатает…',
    attachment: '[вложение] ',
    mediaNotStored: 'Файлы не хранятся на сервере - попросите отправителя прислать это {kind} заново.',
    kindImage: 'изображение',
    kindVideo: 'видео',
    toastIntroduce: 'Сначала представься',
    toastLinkCopied: 'Ссылка скопирована',
    toastNotSent: 'Не отправлено: {err}',
    toastFileTooBig: 'Файл слишком большой',
    toastRoomNotFound: 'Комната не найдена',
    toastFailed: 'Не получилось: {err}',
    toastAi: 'ИИ: {msg}',
    rename: 'Имя',
    save: 'Ок',
    toastRenamed: 'Имя обновлено',
    aiThinking: 'думает…',
    labStyles: 'Стили',
    labThemes: 'Темы',
    labLang: 'Язык',
  },
  en: {
    appTitle: 'Messenger',
    namePlaceholder: "what's your name?",
    create: 'Create chat',
    myChats: 'My chats',
    remove: 'Remove',
    forget: 'Forget',
    theme: 'Theme',
    style: 'Style',
    language: 'Language',
    avatar: 'Avatar',
    avatarPick: 'Pick an image',
    toastAvatarSaved: 'Avatar updated',
    toastAvatarBig: 'Image is too large',
    toastAvatarBad: "Couldn't set the avatar",
    back: 'Back',
    share: 'Invite',
    attach: 'Attach',
    send: 'Send',
    composerPlaceholder: 'Message…  (@ai to summon the AI)',
    chatFallback: 'Chat',
    roomSuffix: ' · chat',
    presenceOnline: '{n} online',
    typing: '{author} is typing…',
    attachment: '[attachment] ',
    mediaNotStored: 'Files are not stored on the server — ask the sender to send this {kind} again.',
    kindImage: 'image',
    kindVideo: 'video',
    toastIntroduce: 'Introduce yourself first',
    toastLinkCopied: 'Link copied',
    toastNotSent: 'Not sent: {err}',
    toastFileTooBig: 'File is too large',
    toastRoomNotFound: 'Room not found',
    toastFailed: 'Failed: {err}',
    toastAi: 'AI: {msg}',
    rename: 'Name',
    save: 'OK',
    toastRenamed: 'Name updated',
    aiThinking: 'thinking…',
    labStyles: 'Styles',
    labThemes: 'Themes',
    labLang: 'Lang',
  },
};

const LANGS = ['ru', 'en'];
const detectLang = () => (String(navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en');

// Слоганы вместо манифеста: короткие, вразнобой по языку, каждый заход — новый.
// Ложатся поверх логотипа мелким повёрнутым текстом (см. #slogan в разметке).
const SLOGANS = [
  'одноразовая философия',
  'для тех, кто НИЧЕГО не хочет',
  'AI всем бунтарям!',
  'brutal HTML',
  'meatbag-friendly',
  'fuck RICH',
  'fuck CORPS',
  'fuck FRAMEWORKS',
  'fuck DPI',
  'fuck VOICE MESSAGES',
  'fuck CLOUDS',
  'fuck DEPENDENCIES',
  'fuck LIBS',
  'fuck COMPLEXITY',
];
const randomSlogan = () => SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
let lang = ls.get('lang', null) || detectLang();

// Перевод по ключу с подстановкой {переменных}.
function t(key, vars) {
  const s = (I18N[lang] || I18N.ru)[key] ?? I18N.ru[key] ?? key;
  return vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.split('{' + k + '}').join(v), s) : s;
}

// Проставляем переводы по статической разметке (data-i18n*).
function applyI18n() {
  document.documentElement.lang = lang;
  document.title = t('appTitle');
  for (const n of document.querySelectorAll('[data-i18n]')) n.textContent = t(n.dataset.i18n);
  for (const n of document.querySelectorAll('[data-i18n-ph]')) n.placeholder = t(n.dataset.i18nPh);
  for (const n of document.querySelectorAll('[data-i18n-title]')) n.title = t(n.dataset.i18nTitle);
  for (const n of document.querySelectorAll('[data-i18n-aria]')) n.setAttribute('aria-label', t(n.dataset.i18nAria));
}

function setLang(l) {
  lang = l;
  ls.set('lang', l);
  applyI18n();
  $('typingLabel').textContent = ''; // подпись «печатает…» живёт вне разметки
  renderPresence();
  renderMyAvatar();                  // имя могло измениться — буквы на аватаре тоже
  syncSwitcher('langs', 'lang', l);
  if (isWelcoming()) renderRooms();
}

// Постоянная личность клиента. Никаких аккаунтов и паролей.
const me = {
  id: ls.get('clientId', null) || (() => { const id = uuid(); ls.set('clientId', id); return id; })(),
  get name() { return ls.get('name', '') || 'anon'; },
  set name(v) { ls.set('name', v); },
};

const state = {
  roomId: null,
  room: null,
  msgs: new Set(),        // id уже отрисованных сообщений (дедуп)
  previews: [],           // домены с превью ссылок (приходят с сервера)
  presenceCount: null,    // сколько людей сейчас онлайн в комнате
  pending: [],            // вложения, готовые к отправке («прикрепить» ≠ «отправить»)
  avatars: new Map(),     // authorId -> dataURL. Только эта сессия: сервер их не хранит
  es: null,               // текущий EventSource
  caps: { maxMediaBytes: 8e6, maxMessageChars: 4000 },
};

// ---------- API ----------
async function req(method, url, body) {
  const res = await fetch(url, body === undefined ? { method } : {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

// ---------- Кеш медиа (IndexedDB): картинки живут после перезагрузки браузера ----------
let dbPromise = null;
function db() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const r = indexedDB.open('messenger', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('media');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbPromise;
}
async function mediaPut(id, dataUrl) {
  try {
    const d = await db();
    d.transaction('media', 'readwrite').objectStore('media').put(dataUrl, id);
  } catch { /* нет IndexedDB — не страшно */ }
}
async function mediaGet(id) {
  try {
    const d = await db();
    return await new Promise((resolve) => {
      const rq = d.transaction('media', 'readonly').objectStore('media').get(id);
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => resolve(null);
    });
  } catch { return null; }
}

// ---------- Тема, стиль и тосты ----------
// Тема = набор CSS-переменных (см. public/theme.css). Порядок = порядок кнопок,
// а первый элемент — тема по умолчанию (matrix).
// Список тем продублирован в public/boot.js — он выполняется до первой отрисовки
// и не может ждать app.js. Правишь здесь — правь и там, иначе кнопки и проверка
// сохранённого выбора разъедутся (тема из localStorage просто слетит в дефолт).
const THEMES = ['matrix', 'fuxxtylle', 'mind-ctrl', 't-800', 'darkness', 'corporate', 'angel', 'max', 'tg', 'vaporwave', 'golden'];
// Стиль — второй параметр визуала. Тема задаёт цвета, стиль — «материал»
// интерфейса: геометрию, типографику и приёмы оформления (см. theme.css).
// Стилей четыре: FLAT (по умолчанию, с хроматической аберрацией в заголовках),
// BRUTAL (крупно и без единого перехода), SKEO (90-е) и JULESVERNE (латунь).
const STYLES = ['flat', 'brutal', 'skeuo', 'julesverne'];

// Все переключатели (язык / тема / стиль) устроены одинаково.
function buildSwitcher(navId, attr, values, onPick) {
  $(navId).replaceChildren(...values.map((v) => {
    const b = el('button', null, v);
    b.dataset[attr] = v;
    b.onclick = () => onPick(v);
    return b;
  }));
}
function syncSwitcher(navId, attr, value) {
  for (const b of $(navId).querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b.dataset[attr] === value));
  }
}

function setTheme(v) {
  if (!THEMES.includes(v)) v = THEMES[0]; // тема могла остаться от старой версии
  document.body.dataset.theme = v;
  ls.set('theme', v);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', getComputedStyle(document.body).backgroundColor);
  syncSwitcher('themes', 'theme', v);
}
function setStyle(v) {
  if (!STYLES.includes(v)) v = STYLES[0]; // стиль тоже мог остаться от старой версии
  document.body.dataset.style = v;
  ls.set('style', v);
  syncSwitcher('styles', 'style', v);
}
let toastTimer;
function toast(msg) {
  const box = $('toast');
  box.textContent = msg;
  box.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add('hidden'), 2600);
}

// Счётчик онлайна зависит от языка, поэтому рисуем его отдельной функцией.
function renderPresence() {
  $('presence').textContent = state.presenceCount == null ? '—' : t('presenceOnline', { n: state.presenceCount });
}

// ---------- Мои чаты ----------
// В localStorage лежит только список идентификаторов («на что я подписан»).
// Сама история сообщений живёт на сервере, поэтому закрытая вкладка ничего
// не теряет: заходишь позже — всё на месте.
const seenKey = (id) => 'seen:' + id;
const myRooms = {
  all() { return ls.get('rooms', []) || []; },
  remember(meta) {
    const list = this.all().filter((r) => r.id !== meta.id);
    list.unshift({ id: meta.id, name: meta.name || t('chatFallback') });
    ls.set('rooms', list.slice(0, 40));
  },
  forget(id) {
    ls.set('rooms', this.all().filter((r) => r.id !== id));
    try { localStorage.removeItem(seenKey(id)); } catch { /* приватный режим */ }
  },
  seen(id) { ls.set(seenKey(id), Date.now()); },
  seenAt(id) { return ls.get(seenKey(id), 0) || 0; },
};

function isWelcoming() { return !$('welcome').classList.contains('hidden'); }

// Непрочитанные и состав участников считает сервер — экран входа не тянет
// историю каждой комнаты целиком.
async function roomInfo(id) {
  const q = `since=${myRooms.seenAt(id)}&exclude=${encodeURIComponent(me.id)}`;
  try {
    const d = await req('GET', `/api/rooms/${id}/unread?${q}`);
    return { count: d.count || 0, people: Array.isArray(d.people) ? d.people : [] };
  } catch { return { count: 0, people: [] }; }
}

let unreadTimer;
async function renderRooms() {
  const list = myRooms.all();
  const box = $('roomsList');
  if (!list.length) { box.replaceChildren(); box.classList.add('hidden'); document.title = t('appTitle'); return; }
  box.classList.remove('hidden');

  const info = await Promise.all(list.map((r) => roomInfo(r.id)));
  let total = 0;
  box.replaceChildren(el('h2', null, t('myChats')), ...list.map((room, i) => {
    total += info[i].count;
    const item = el('div', 'room-item');

    const row = el('button', 'room-row');
    row.type = 'button';
    // Никакого цветного квадратика: вместо выдуманного аватара — имя комнаты и
    // реальный список тех, кто в ней писал.
    const head = el('span', 'rhead');
    head.appendChild(el('span', 'rname', room.name));
    if (info[i].people.length) head.appendChild(el('span', 'rpeople', info[i].people.join(', ')));
    row.appendChild(head);
    if (info[i].count > 0) row.appendChild(el('span', 'badge', info[i].count > 99 ? '99+' : String(info[i].count)));
    row.onclick = () => openRoom(room.id).catch(() => {
      myRooms.forget(room.id);
      renderRooms();
      toast(t('toastRoomNotFound'));
    });

    const forget = el('button', 'forget', '×');
    forget.type = 'button';
    forget.title = t('forget');
    forget.setAttribute('aria-label', t('forget'));
    forget.onclick = () => { myRooms.forget(room.id); renderRooms(); };

    item.append(row, forget);
    return item;
  }));
  // Непрочитанные видны и в заголовке вкладки — это единственная «нотификация»
  // для закрытой вкладки, которую можно сделать без Web Push.
  document.title = total ? `(${total}) ${t('appTitle')}` : t('appTitle');
}

// Пока мы на экране входа — раз в 10 секунд спрашиваем сервер про непрочитанное.
function watchUnread() {
  clearInterval(unreadTimer);
  unreadTimer = setInterval(() => {
    if (document.hidden || !isWelcoming()) return;
    renderRooms();
  }, 10_000);
}

// ---------- Аватары ----------
// По умолчанию аватар вообще нигде не хранится: он генерируется из
// идентификатора человека (цвет из хеша + буквы имени). Свою картинку можно
// поставить — она остаётся в localStorage и уходит участникам комнаты в
// реальном времени: сервер её только передаёт, ни на диск, ни в память.
function avatarHue(seed) {
  let h = 0;
  const s = String(seed || '?');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
function avatarText(name) {
  const words = String(name || '?').trim().split(/\s+/).slice(0, 2);
  return (words.map((w) => w[0] || '').join('') || '?').toUpperCase();
}
function paintAvatar(node, seed, name) {
  node.dataset.a = seed;
  const custom = state.avatars.get(seed) || (seed === me.id ? ls.get('avatar', null) : null);
  node.textContent = custom ? '' : avatarText(name);
  node.style.backgroundImage = custom ? `url("${custom}")` : '';
  node.style.backgroundColor = custom ? 'transparent' : `hsl(${avatarHue(seed)} 62% 38%)`;
  return node;
}
function avatarNode(seed, name) { return paintAvatar(el('span', 'ava'), seed, name); }

// Пришёл чужой аватар — обновляем все уже нарисованные аватарки этого человека.
function applyAvatar(authorId, dataUrl) {
  state.avatars.set(authorId, dataUrl);
  for (const n of document.querySelectorAll('.ava')) {
    if (n.dataset.a === authorId) {
      n.textContent = '';
      n.style.backgroundImage = `url("${dataUrl}")`;
      n.style.backgroundColor = 'transparent';
    }
  }
}

function renderMyAvatar() {
  const node = $('myava');
  if (node) paintAvatar(node, me.id, me.name);
}

// Отправляем свой аватар в комнату. force — своя воля, иначе с троттлингом:
// этим же способом отвечаем на появление нового участника (онлайна стало больше).
let lastAvatarSent = 0;
function announceAvatar(force) {
  const dataUrl = ls.get('avatar', null);
  if (!dataUrl || !state.roomId) return;
  const now = Date.now();
  if (!force && now - lastAvatarSent < 1500) return;
  lastAvatarSent = now;
  req('POST', `/api/rooms/${state.roomId}/avatar`, { clientId: me.id, author: me.name, dataUrl }).catch(() => {});
}

// Уменьшаем картинку до 64×64 на клиенте: маленький dataURL и никакого сервера.
function shrinkAvatar(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const side = Math.min(img.width, img.height) || size;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(
        img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size,
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

async function setAvatarFile(file) {
  if (!file) return;
  if (file.size > state.caps.maxMediaBytes) { toast(t('toastAvatarBig')); return; }
  try {
    const dataUrl = await shrinkAvatar(file);
    ls.set('avatar', dataUrl);
    applyAvatar(me.id, dataUrl);
    announceAvatar(true);
    toast(t('toastAvatarSaved'));
  } catch { toast(t('toastAvatarBad')); }
}

// ---------- Отрисовка сообщений ----------
const messagesEl = $('messages');
const timeStr = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const atBottom = () => messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 90;
const toBottom = () => { messagesEl.scrollTop = messagesEl.scrollHeight; };

// Ссылки в тексте делаем кликабельными, экранируя всё остальное (безопасно по умолчанию).
function linkify(container, text) {
  const re = /(https?:\/\/[^\s<>"']+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) container.appendChild(document.createTextNode(text.slice(last, m.index)));
    const a = el('a', null, m[1]);
    a.href = m[1];
    a.target = '_blank';
    a.rel = 'noopener noreferrer nofollow';
    container.appendChild(a);
    last = m.index + m[1].length;
  }
  if (last < text.length) container.appendChild(document.createTextNode(text.slice(last)));
}

// ---------- Markdown ----------
// Базовый markdown без библиотек и без dangerouslySetInnerHTML-фокусов:
// разметка собирается в DOM-узлы, поэтому HTML из текста сообщения физически
// не может исполниться — экранировать нечего.
// Поддержано: **жирный**, *курсив* и _курсив_, `код`, ```блок```, ~~зачёркнутый~~,
// [ссылка](https://…), списки -, 1. и цитаты >. Заголовки намеренно пропущены:
// в чате они только мешают.
const MD_INLINE = /(\*\*[^\n]+?\*\*|__[^\n]+?__|`[^`\n]+`|~~[^\n]+?~~|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
const MD_UL = /^\s*[-*+]\s+(.*)$/;
const MD_OL = /^\s*\d+[.)]\s+(.*)$/;
const MD_FENCE = /^\s*```/;

// Строчная разметка. Голые ссылки (без [ ]) остаются на linkify.
function inlineMd(parent, text) {
  let last = 0;
  for (const m of text.matchAll(MD_INLINE)) {
    if (m.index > last) linkify(parent, text.slice(last, m.index));
    const token = m[0];
    let node;
    if (token[0] === '`') node = el('code', null, token.slice(1, -1));
    else if (token.startsWith('**') || token.startsWith('__')) node = el('strong', null, token.slice(2, -2));
    else if (token.startsWith('~~')) node = el('del', null, token.slice(2, -2));
    else if (token[0] === '[') {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      node = el('a', null, link[1]);
      node.href = link[2];
      node.target = '_blank';
      node.rel = 'noopener noreferrer nofollow';
    } else node = el('em', null, token.slice(1, -1));
    parent.appendChild(node);
    last = m.index + token.length;
  }
  if (last < text.length) linkify(parent, text.slice(last));
}

// Блочная разметка: построчно, одна строка = абзац, элемент списка или цитата.
function renderMarkdown(parent, text) {
  let list = null; // текущий <ul>/<ol>
  let code = null; // буфер ```-блока
  for (const line of String(text).split('\n')) {
    if (code) {
      if (MD_FENCE.test(line)) { parent.appendChild(code); code = null; }
      else code.firstChild.appendChild(document.createTextNode(line + '\n'));
      continue;
    }
    if (MD_FENCE.test(line)) {
      list = null;
      const pre = el('pre');
      pre.appendChild(el('code', null, ''));
      code = pre;
      continue;
    }
    const ul = line.match(MD_UL);
    const ol = ul ? null : line.match(MD_OL);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (!list || list.tagName.toLowerCase() !== tag) { list = el(tag); parent.appendChild(list); }
      const item = el('li');
      inlineMd(item, ul ? ul[1] : ol[1]);
      list.appendChild(item);
      continue;
    }
    list = null;
    if (!line.trim()) continue;
    const quote = line.match(/^\s*>\s?(.*)$/);
    const block = el(quote ? 'blockquote' : 'p');
    inlineMd(block, quote ? quote[1] : line);
    parent.appendChild(block);
  }
  if (code) parent.appendChild(code); // незакрытый ``` — текст не теряем
}

// «Дышащие» точки: пустой пузырь ИИ выглядит поломкой, точки — работой.
function dotsNode() {
  const box = el('span', 'dots');
  box.setAttribute('aria-label', t('aiThinking'));
  box.append(el('i'), el('i'), el('i'));
  return box;
}

// Стак: подряд идущие сообщения одного человека — одна группа. Аватар и подпись
// видны только у верхнего; остальные идут «продолжением», без повторов.
const STACK_GAP_MS = 5 * 60 * 1000;

function addMessage(msg) {
  if (state.msgs.has(msg.id)) return;
  state.msgs.add(msg.id);
  const stick = atBottom();

  const own = msg.authorId === me.id;
  const row = el('div', 'msg' + (own ? ' own' : '') + (msg.bot ? ' bot' : ''));
  row.dataset.id = msg.id;
  row.dataset.authorId = msg.authorId;
  row.dataset.author = msg.author;      // чтобы переименование нашло свои сообщения
  row.dataset.ts = String(msg.ts);

  // Предыдущее сообщение в ленте (row ещё не вставлен — берём прямо из контейнера).
  const prev = messagesEl.lastElementChild;
  const cont = prev && prev.classList.contains('msg') && !prev.classList.contains('system')
    && prev.dataset.authorId === msg.authorId
    && msg.ts - Number(prev.dataset.ts) < STACK_GAP_MS;

  if (cont) {
    row.classList.add('cont'); // продолжение стака: ни аватара, ни подписи
  } else {
    // Свои сообщения подписаны так же, как чужие: аватар и время. Так видно, как
    // тебя читают остальные, и не нужен отдельный дизайн «своего» пузыря.
    const meta = el('div', 'meta');
    meta.append(avatarNode(msg.authorId, msg.author), el('span', null, `${msg.author} · ${timeStr(msg.ts)}`));
    row.appendChild(meta);
  }

  const bubble = el('div', 'bubble');
  if (msg.text) {
    const p = el('div', 'md');
    renderMarkdown(p, msg.text);
    bubble.appendChild(p);
    const url = firstWhitelistedUrl(msg.text);
    if (url) previewCard(bubble, url);
  }
  if (msg.media) bubble.appendChild(mediaNode(msg.media));
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  if (stick) toBottom();
  if (!document.hidden && state.roomId) myRooms.seen(state.roomId); // смотрим на комнату — значит прочитано
}

// Медиа: сначала пробуем локальный кеш, иначе берём из сообщения и кешируем.
function mediaNode(media) {
  const box = el('div');
  (async () => {
    const src = media.dataUrl || (await mediaGet(media.id));
    if (!src) {
      box.appendChild(el('div', 'pruned', t('mediaNotStored', { kind: t(media.kind === 'video' ? 'kindVideo' : 'kindImage') })));
      return;
    }
    await mediaPut(media.id, src);
    const node = media.kind === 'video' ? el('video') : el('img');
    node.src = src;
    node.alt = media.name || '';
    node.loading = 'lazy';
    if (media.kind === 'video') { node.controls = true; node.playsInline = true; }
    box.replaceChildren(node);
  })();
  return box;
}

function firstWhitelistedUrl(text) {
  const m = text.match(/https?:\/\/[^\s<>"']+/);
  if (!m) return null;
  try {
    const host = new URL(m[0]).hostname;
    return state.previews.some((d) => host === d || host.endsWith('.' + d)) ? m[0] : null;
  } catch { return null; }
}

// Превью ссылки запрашиваем у сервера (там белый список доменов).
function previewCard(parent, url) {
  req('GET', '/api/preview?url=' + encodeURIComponent(url)).then((d) => {
    if (d.error) return;
    const a = el('a', 'preview');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer nofollow';
    if (d.image) {
      const img = el('img');
      img.src = d.image;
      img.loading = 'lazy';
      img.alt = '';
      img.onerror = () => img.remove();
      a.appendChild(img);
    }
    const body = el('div', 'pv-body');
    body.appendChild(el('div', 'pv-domain', d.domain || ''));
    body.appendChild(el('div', 'pv-title', d.title || url));
    if (d.description) body.appendChild(el('div', 'pv-desc', d.description.slice(0, 200)));
    a.appendChild(body);
    parent.appendChild(a);
    if (atBottom()) toBottom();
  }).catch(() => { /* превью — необязательно */ });
}

// ---------- Реалтайм (SSE) ----------
let typingTimer;
let aiRow = null;
let aiText = '';      // накопленный ответ ИИ: нужен для догоняющей отрисовки
let aiPainted = 0;    // когда последний раз перерисовывали разметку
let aiFlushTimer = 0;

function connectEvents() {
  if (state.es) state.es.close();
  const es = new EventSource(`/api/rooms/${state.roomId}/events?clientId=${encodeURIComponent(me.id)}`);
  state.es = es;

  es.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    addMessage(msg);
    notify(msg);
  });
  es.addEventListener('presence', (e) => {
    const count = JSON.parse(e.data).count;
    // Онлайна стало больше — кто-то вошёл. Сервер аватары не хранит, поэтому
    // напоминаем о своём: иначе новичок увидит сгенерированную заглушку.
    if (state.presenceCount != null && count > state.presenceCount) announceAvatar(false);
    state.presenceCount = count;
    renderPresence();
  });
  // Аватар участника: держим только в памяти этой вкладки.
  es.addEventListener('avatar', (e) => {
    const info = JSON.parse(e.data);
    if (info && info.authorId && info.dataUrl) applyAvatar(info.authorId, info.dataUrl);
  });
  es.addEventListener('rename', (e) => renamePeer(JSON.parse(e.data)));
  es.addEventListener('typing', (e) => {
    const info = JSON.parse(e.data);
    if (info.clientId === me.id) return;
    $('typingLabel').textContent = t('typing', { author: info.author });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { $('typingLabel').textContent = ''; }, 3000);
  });
  es.addEventListener('ai:start', (e) => startAiBubble(JSON.parse(e.data).model));
  es.addEventListener('ai:token', (e) => appendAiToken(JSON.parse(e.data).text));
  es.addEventListener('ai:end', endAiBubble);
  es.addEventListener('ai:error', (e) => { endAiBubble(); toast(t('toastAi', { msg: JSON.parse(e.data).message })); });
  // onerror не трогаем: EventSource сам переподключается.
}

// Живой «пузырь» ИИ, пока идёт стриминг ответа.
function startAiBubble(model) {
  endAiBubble();
  aiRow = el('div', 'msg bot');
  aiRow.dataset.authorId = 'ai';
  aiRow.dataset.author = 'AI';
  aiRow.dataset.ts = String(Date.now());
  const meta = el('div', 'meta');
  meta.append(avatarNode('ai', 'AI'), el('span', null, `AI${model ? ' · ' + model : ''} ${t('aiThinking')}`));
  aiRow.appendChild(meta);
  const bubble = el('div', 'bubble');
  bubble.id = 'aiLive';
  bubble.appendChild(dotsNode()); // пока нет ни одного токена — показываем точки
  aiRow.appendChild(bubble);
  messagesEl.appendChild(aiRow);
  toBottom();
}
// Токены приходят часто, а разметка — дело недешёвое: перерисовываем не чаще
// четырёх раз в секунду, а для последних токенов ставим один догоняющий кадр.
function paintAi() {
  const b = $('aiLive');
  if (!b || !aiText) return;
  const box = el('div', 'md');
  renderMarkdown(box, aiText);
  b.replaceChildren(box);
  if (atBottom()) toBottom();
}
function appendAiToken(chunk) {
  const b = $('aiLive');
  if (!b) return;
  if (!aiText) b.replaceChildren(); // точки своё дело сделали
  aiText += chunk;
  const now = Date.now();
  if (now - aiPainted > 250) { aiPainted = now; paintAi(); return; }
  clearTimeout(aiFlushTimer);
  aiFlushTimer = setTimeout(paintAi, 260);
}
function endAiBubble() {
  clearTimeout(aiFlushTimer);
  aiText = '';
  if (aiRow) { aiRow.remove(); aiRow = null; }
}

// ---------- Уведомления браузера ----------
function askNotify() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}
function notify(msg) {
  if (!document.hidden || msg.authorId === me.id) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const body = (msg.media ? t('attachment') : '') + (msg.text || '');
  try { new Notification(msg.author, { body: body.slice(0, 140), tag: state.roomId }); } catch { /* ignore */ }
}

// ---------- Отправка ----------
const sendMessage = (payload) =>
  req('POST', `/api/rooms/${state.roomId}/messages`, { ...payload, clientId: me.id, author: me.name });

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Файлы не улетают сразу: они «прикрепляются» и ждут нажатия «отправить».
async function stageFiles(fileList) {
  for (const file of fileList) {
    if (file.size > state.caps.maxMediaBytes) { toast(t('toastFileTooBig')); continue; }
    const dataUrl = await readAsDataUrl(file);
    state.pending.push({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      preview: file.type.startsWith('image/') ? dataUrl : null,
    });
  }
  renderPending();
}

// Полоска прикреплённых файлов над композером: миниатюра + имя + крестик.
function renderPending() {
  $('pending').replaceChildren(...state.pending.map((p) => {
    const chip = el('div', 'chip');
    if (p.preview) {
      const img = el('img');
      img.src = p.preview;
      img.alt = '';
      chip.appendChild(img);
    }
    chip.appendChild(el('span', 'chip-name', p.name));
    const x = el('button', null, '×');
    x.type = 'button';
    x.title = t('remove');
    x.setAttribute('aria-label', t('remove'));
    x.onclick = () => { state.pending = state.pending.filter((q) => q !== p); renderPending(); };
    chip.appendChild(x);
    return chip;
  }));
}

// Поле растёт по содержимому. Внимание на рамку: поле у нас border-box, а
// scrollHeight рамку не считает — поэтому прибавляем её сами. Без этого поле
// после автосайза оказывалось ниже своей настоящей высоты, и кнопки «+»/«→»
// в композере торчали из строки (в BRUTAL рамка 3px — заметнее всего).
function autosize() {
  const t = $('text');
  t.style.height = 'auto';
  const cs = getComputedStyle(t);
  const frame = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  t.style.height = Math.min(t.scrollHeight + frame, window.innerHeight * 0.4) + 'px';
}

function wireComposer() {
  const composer = $('composer');
  const text = $('text');

  composer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = text.value.trim();
    const files = state.pending;
    if (!value && !files.length) return; // отправлять нечего
    text.value = '';
    state.pending = [];
    renderPending();
    autosize();
    try {
      if (files.length) {
        // Первое вложение забирает набранный текст, остальные уходят своим сообщением.
        for (let i = 0; i < files.length; i++) {
          const { name, type, size, dataUrl } = files[i];
          await sendMessage({ text: i === 0 ? value : '', media: { name, type, size, dataUrl } });
        }
      } else {
        await sendMessage({ text: value });
      }
    } catch (err) {
      toast(t('toastNotSent', { err: err.message }));
      text.value = value;
      state.pending = files.concat(state.pending); // вернём вложения обратно в очередь
      renderPending();
      autosize();
    }
  });

  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); composer.requestSubmit(); }
  });

  let lastTyping = 0;
  text.addEventListener('input', () => {
    autosize();
    const now = Date.now();
    if (now - lastTyping > 1500) {
      lastTyping = now;
      req('POST', `/api/rooms/${state.roomId}/typing`, { author: me.name, clientId: me.id }).catch(() => {});
    }
  });

  $('attach').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    await stageFiles(files);
  });

  composer.addEventListener('dragover', (e) => { e.preventDefault(); composer.classList.add('drag'); });
  composer.addEventListener('dragleave', () => composer.classList.remove('drag'));
  composer.addEventListener('drop', async (e) => {
    e.preventDefault();
    composer.classList.remove('drag');
    await stageFiles(e.dataTransfer.files);
  });
}

// ---------- Приглашение ----------
// Ссылка /j/<id> — единственный способ позвать человека: кто по ней перейдёт,
// попадёт в тот же чат (роутинг — в boot).
//
// Ловушка secure context: и Web Share (`navigator.share`), и Clipboard API живут
// ТОЛЬКО на https или localhost. На http://<ip> их в объекте navigator нет вовсе,
// и прежняя строка `navigator.clipboard?.writeText(url).then(…)` из-за опциональной
// цепочки целиком обращалась в undefined: кнопка молча НИЧЕГО не делала. Поэтому
// ступеней три, сверху вниз: системное «поделиться» → Clipboard API → execCommand.
// Последний в secure context не нуждается и работает по клику (жест пользователя),
// хотя и помечен устаревшим.
async function shareInvite() {
  const url = location.origin + '/j/' + state.roomId;
  if (navigator.share) {
    try { await navigator.share({ title: state.room?.name || t('chatFallback'), url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; } // закрыли меню — это не сбой
  }
  if (await copyText(url)) { toast(t('toastLinkCopied')); return; }
  showLink(url); // браузер не умеет ни шэра, ни буфера — отдаём ссылку руками
}

// Буфер обмена: writeText требует secure context, поэтому есть запасной путь.
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* отказ в правах — пробуем execCommand */ }
  return legacyCopy(text);
}
function legacyCopy(text) {
  const ta = el('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length); // iOS Safari без этого поле не выделяется
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

// Крайний случай: ни шэра, ни буфера. Показываем саму ссылку — она уже выделена,
// остаётся её скопировать. Так приглашение работает и на голом http.
function showLink(url) {
  $('linkInput').value = url;
  $('linkBox').classList.remove('hidden');
  $('linkInput').focus();
  $('linkInput').select();
}
function closeLink() { $('linkBox').classList.add('hidden'); }

// ---------- Роутинг ----------
async function openRoom(roomId) {
  const meta = await req('GET', `/api/rooms/${roomId}`);
  me.name = $('name').value.trim() || me.name;
  history.replaceState({}, '', '/j/' + roomId);

  state.roomId = roomId;
  state.room = meta;
  state.msgs.clear();
  state.pending = [];
  state.avatars.clear();
  renderPending();
  renderMyAvatar();
  myRooms.remember(meta);   // чат остаётся в списке, даже если вкладку закрыть
  myRooms.seen(roomId);     // с этого момента всё, что пришло раньше, — прочитано
  $('roomname').textContent = meta.name || t('chatFallback');
  state.presenceCount = null;
  renderPresence();
  $('welcome').classList.add('hidden');
  $('chat').classList.remove('hidden');
  document.title = t('appTitle');
  messagesEl.replaceChildren();
  askNotify();

  const { messages } = await req('GET', `/api/rooms/${roomId}/messages`);
  messages.forEach(addMessage);
  connectEvents();
  announceAvatar(true); // напомнить о своём аватаре тем, кто уже в комнате
  autosize();
  $('text').focus();
}

// Возврат на экран входа. Без перезагрузки: список чатов остаётся свежим,
// а адрес снова становится `/` — и никакого авто-открытия старого чата.
function showWelcome() {
  state.es?.close();
  state.es = null;
  state.roomId = null;
  state.room = null;
  state.msgs.clear();
  state.pending = [];
  state.avatars.clear();
  state.presenceCount = null;
  messagesEl.replaceChildren();
  $('typingLabel').textContent = '';
  $('chat').classList.add('hidden');
  $('welcome').classList.remove('hidden');
  if (location.pathname !== '/') history.replaceState({}, '', '/');
  renderRooms();
}

// Кнопка «создать» живёт в списке чатов. Имя нужно только для создания, поэтому
// спрашиваем его ровно здесь — и только если его ещё нет.
function onCreateClick() {
  const name = $('name').value.trim() || (me.name !== 'anon' ? me.name : '');
  if (!name) { openNameGate(); return; }
  createRoom(name);
}
function openNameGate() {
  $('nameGate').classList.remove('hidden');
  if (!$('name').value) $('name').value = me.name === 'anon' ? '' : me.name;
  $('name').focus();
}
function submitNameGate() {
  const name = $('name').value.trim();
  if (!name) { $('name').focus(); toast(t('toastIntroduce')); return; }
  $('nameGate').classList.add('hidden');
  createRoom(name);
}

async function createRoom(name) {
  name = String(name || '').trim();
  if (!name) { openNameGate(); return; }
  me.name = name;
  askNotify();
  try {
    const meta = await req('POST', '/api/rooms', { name: name + t('roomSuffix'), clientId: me.id });
    await openRoom(meta.id);
  } catch (e) { toast(t('toastFailed', { err: e.message })); }
}

// ---------- Имя ----------
// Аккаунта нет: имя — это подпись под сообщением в localStorage. Но подпись
// ровно одна на всю историю: смена имени переписывает и прошлые сообщения,
// поэтому «притвориться двумя людьми» не выйдет.
function openRename() {
  $('renameBox').classList.remove('hidden');
  $('renameInput').value = me.name === 'anon' ? '' : me.name;
  $('renameInput').focus();
  $('renameInput').select();
}
function closeRename() { $('renameBox').classList.add('hidden'); }
function saveName(value) {
  const name = String(value || '').trim().slice(0, 32);
  closeRename();
  if (!name || name === me.name) return;
  me.name = name;           // localStorage
  $('name').value = name;   // на экране входа подставляется то же имя
  renderMyAvatar();         // буквы на своём аватаре меняются сразу
  applyRename(me.id, name); // и подписи под прошлыми моими сообщениями — тоже
  announceName(name);       // сервер перепишет историю и расскажет остальным
  toast(t('toastRenamed'));
}
// Сервер имени как «аккаунта» не хранит: он чинит подписи в истории комнаты и
// передаёт новое имя тем, кто сейчас в ней.
function announceName(name) {
  if (!state.roomId) return;
  req('POST', `/api/rooms/${state.roomId}/rename`, { clientId: me.id, author: name || me.name }).catch(() => {});
}
// Кто-то переименовался — обновляем и аватары, и подписи под прошлыми сообщениями.
function renamePeer(info) {
  if (!info || !info.author || !info.clientId) return;
  applyRename(info.clientId, info.author);
}
function applyRename(clientId, author) {
  for (const n of document.querySelectorAll('.ava')) {
    if (n.dataset.a === clientId && n.textContent) n.textContent = avatarText(author);
  }
  for (const row of document.querySelectorAll('.msg')) {
    if (row.dataset.authorId !== clientId) continue;
    row.dataset.author = author;
    const span = row.querySelector('.meta > span:not(.ava)');
    if (span) span.textContent = `${author} · ${timeStr(Number(row.dataset.ts))}`;
  }
}

// ---------- Старт ----------
async function boot() {
  // Один запрос к серверу: белый список доменов для превью ссылок и лимиты.
  // Не получилось — не страшно: сообщим при первом действии.
  try {
    const h = await req('GET', '/api/health');
    state.previews = h.preview || [];
    if (h.limits) state.caps = h.limits;
  } catch { /* сервер недоступен */ }

  // Переключатели: тема и стиль — один код на всех (см. buildSwitcher).
  buildSwitcher('themes', 'theme', THEMES, setTheme);
  setTheme(ls.get('theme', THEMES[0]));
  buildSwitcher('styles', 'style', STYLES, setStyle);
  setStyle(ls.get('style', STYLES[0]));

  // Переключатель языка: ru / en. Применяется мгновенно, выбор запоминается.
  buildSwitcher('langs', 'lang', LANGS, setLang);
  setLang(lang);

  $('name').value = ls.get('name', '') || '';
  $('slogan').textContent = randomSlogan(); // каждый заход — новый слоган поверх лого
  $('create').onclick = onCreateClick;
  $('nameGate').addEventListener('submit', (e) => { e.preventDefault(); submitNameGate(); });
  $('share').onclick = shareInvite;
  $('back').onclick = showWelcome;
  // Имя меняется в чате, а не только при создании: аккаунта нет, есть подпись.
  $('rename').onclick = openRename;
  $('renameBox').addEventListener('submit', (e) => { e.preventDefault(); saveName($('renameInput').value); });
  $('renameInput').addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRename(); });
  // Ссылка-приглашение. Поле подсказки — то же, что у смены имени: одна строка
  // под топбаром, submit (Enter или «Ок») и Escape закрывают.
  $('linkBox').addEventListener('submit', (e) => { e.preventDefault(); closeLink(); });
  $('linkInput').addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLink(); });
  $('myavatar').onclick = () => $('avatar').click();
  $('avatar').onchange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    setAvatarFile(file);
  };
  renderMyAvatar();
  wireComposer();

  // Вернулись во вкладку — обновляем список чатов и отметку «прочитано».
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (state.roomId) myRooms.seen(state.roomId);
    else renderRooms();
  });

  // Ссылка-приглашение /j/<id> — единственный способ открыть чат автоматически.
  // Голый `/` НЕ должен телепортировать в старый чат, иначе кнопка «назад» выглядит
  // сломанной: для возврата есть отдельная кнопка на экране входа.
  const invite = (location.pathname.match(/^\/j\/([A-Za-z0-9_-]{4,64})/) || [])[1];
  if (invite) {
    try { await openRoom(invite); return; } catch {
      history.replaceState({}, '', '/');
      toast(t('toastRoomNotFound'));
    }
  }

  // Никаких авто-переходов: показываем «Мои чаты» и ждём выбора человека.
  renderRooms();
  watchUnread();
}

boot();
