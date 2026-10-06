// Messenger — прокси к OpenAI-совместимому API (DeepSeek по умолчанию).
// КЛЮЧ ЖИВЁТ ТОЛЬКО НА СЕРВЕРЕ и никогда не уходит клиенту.
// Здесь же — экономия токенов (max_tokens) и сборка контекста из истории комнаты.
import { config } from './config.js';

// Генератор: отдаёт куски ответа по мере поступления (стриминг).
async function* streamChat(messages) {
  const res = await fetch(config.ai.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + config.ai.apiKey,
    },
    body: JSON.stringify({
      model: config.ai.model,
      messages,
      stream: true,
      max_tokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
    }),
  });

  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new Error(`AI ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // незавершённая строка — вернём в буфер
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;
      const payload = s.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch { /* неполный JSON — пропускаем */ }
    }
  }
}

// Собираем краткий контекст из истории комнаты + передаём финальный промпт.
export async function askAI({ history = [], prompt = '', onToken }) {
  const messages = [{ role: 'system', content: config.ai.system }];
  for (const m of history.slice(-config.ai.contextMessages)) {
    const text = (m.text || '').trim();
    if (!text) continue;
    messages.push({
      role: m.bot ? 'assistant' : 'user',
      content: m.bot ? text : `${m.author}: ${text}`,
    });
  }
  if (prompt) messages.push({ role: 'user', content: prompt });

  let full = '';
  for await (const chunk of streamChat(messages)) {
    full += chunk;
    if (onToken) onToken(chunk);
  }
  return full.trim();
}

export const aiReady = () => Boolean(config.ai.apiKey);
