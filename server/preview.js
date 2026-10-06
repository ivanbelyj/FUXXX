// Messenger — превью ссылок (Open Graph) только для доменов из белого списка.
// Белый список принципиален: он же защищает сервер от SSRF-абьюза.
import { config } from './config.js';

const cache = new Map(); // url -> { at, data }
const TTL = 30 * 60 * 1000;

function allowed(host) {
  return config.previewWhitelist.some((d) => host === d || host.endsWith('.' + d));
}

const pick = (html, re) => {
  const m = html.match(re);
  return m ? m[1].trim() : '';
};
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");

export async function preview(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { return { error: 'bad url' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'bad protocol' };
  if (!allowed(u.hostname)) return { error: 'domain not allowed' };

  const hit = cache.get(u.href);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(u.href, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'MessengerBot/1.0 (link preview)', accept: 'text/html' },
    });
    clearTimeout(timer);

    let html = '';
    if ((res.headers.get('content-type') || '').includes('html')) {
      const buf = await res.arrayBuffer();
      html = Buffer.from(buf).toString('utf8').slice(0, 200_000);
    }

    const data = {
      url: u.href,
      domain: u.hostname,
      title:
        decode(pick(html, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
        pick(html, /<meta[^>]+name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i) ||
        pick(html, /<title[^>]*>([^<]*)<\/title>/i)) || u.hostname,
      description: decode(
        pick(html, /<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]*content=["']([^"']*)["']/i)
      ),
      image: decode(pick(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i)),
      icon: u.origin + '/favicon.ico',
    };
    cache.set(u.href, { at: Date.now(), data });
    if (cache.size > 500) cache.clear();
    return data;
  } catch {
    return { error: 'fetch failed' };
  }
}
