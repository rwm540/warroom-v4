import './env.js';
import { createApp } from '../../src/app.js';
import { createMemoryStore } from './memoryStore.js';

/** Cookie jar so tests behave like a browser (HttpOnly cookies are replayed automatically). */
export function createCookieJar() {
  const jar = new Map();
  return {
    header() {
      if (jar.size === 0) return '';
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    absorb(response) {
      const list = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
      for (const cookie of list) {
        const [pair] = cookie.split(';');
        const index = pair.indexOf('=');
        if (index <= 0) continue;
        const name = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (value === '') jar.delete(name);
        else jar.set(name, value);
      }
    },
    raw(name) {
      return jar.get(name);
    },
    has(name) {
      return jar.has(name);
    },
    set(name, value) {
      jar.set(name, value);
    },
    remove(name) {
      jar.delete(name);
    },
  };
}

export function createFakeSms() {
  const sent = [];
  const statusCalls = [];
  return {
    sent,
    statusCalls,
    lastCode() {
      return sent.length ? sent[sent.length - 1].otp : null;
    },
    lastMessageId() {
      return sent.length ? `test-${sent.length}` : null;
    },
    configured: () => true,
    providerName: () => 'mock-test',
    async send(phone, otp, meta) {
      // Test-only in-memory capture: no SMS is sent and nothing is written to logs.
      sent.push({ phone, otp, meta });
      return { ok: true, ids: [`test-${sent.length}`], accepted: true, provider: 'mock-test' };
    },
    /** Sanitized stand-in for the documented IPPanel delivery report (never calls the network). */
    async deliveryStatus(messageId) {
      statusCalls.push(String(messageId));
      return {
        messageId: String(messageId),
        provider: 'mock-test',
        state: 'finish',
        recipientsCount: 1,
        counts: { delivered: 1, notDelivered: 0, blacklisted: 0, inProgress: 0 },
        delivered: true,
        recipients: [{ phone: '0912***33', status: 2, state: 'delivered', parts: 1 }],
      };
    },
  };
}

export function createFakeRedis({ denyAbove = null, available = true } = {}) {
  const counters = new Map();
  return {
    counters,
    denyCheck(key, max, windowSeconds) {
      if (!available) return false;
      if (denyAbove !== null) return denyAbove;
      const entry = counters.get(key);
      const now = Date.now();
      if (!entry || entry.windowEnd <= now) {
        counters.set(key, { count: 1, windowEnd: now + windowSeconds * 1000 });
        return false;
      }
      entry.count += 1;
      return entry.count > max;
    },
  };
}

export async function startTestServer({ store = createMemoryStore(), sms = createFakeSms(), redis = createFakeRedis() } = {}) {
  const app = createApp({ store, sms, redis });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    store,
    sms,
    redis,
    baseUrl,
    origin: 'http://localhost:3000',
    async request(path, { method = 'POST', body, jar, headers = {}, origin = 'http://localhost:3000', csrf = true } = {}) {
      const requestHeaders = { ...headers };
      if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
      if (origin !== null) requestHeaders.Origin = origin;
      if (jar) {
        const cookieHeader = jar.header();
        if (cookieHeader) requestHeaders.Cookie = cookieHeader;
        // Mirrors the SPA: the readable CSRF cookie is copied into the header automatically.
        if (csrf && requestHeaders['X-CSRF-Token'] === undefined && jar.has('warroom_csrf')) {
          requestHeaders['X-CSRF-Token'] = jar.raw('warroom_csrf');
        }
      }
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (jar) jar.absorb(response);
      let json = null;
      try {
        json = await response.clone().json();
      } catch {
        json = null;
      }
      return { status: response.status, json, headers: response.headers };
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export { createMemoryStore };
