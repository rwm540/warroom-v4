import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';

const logFilePath = path.resolve(process.cwd(), 'log', 'log.txt');
const allowedLevels = new Set(['info', 'warning', 'error', 'security']);
const allowedSources = new Set(['client', 'server']);

export function shouldWriteOperationLog(input: { event?: unknown; level?: unknown }): boolean {
  const eventName = String(input.event || '').toLowerCase();
  const isAuthEvent = /(^|[._-])(auth|login|logout|register|registration|password_reset)([._-]|$)/.test(eventName);
  const isRequestEvent = /(^|[._-])(request|submission|ticket|join|merge|transfer|payment)([._-]|$)/.test(eventName);
  const isErrorEvent = input.level === 'error' || input.level === 'warning';
  return isAuthEvent || isRequestEvent || isErrorEvent;
}

function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map(item => sanitizeLogValue(item, depth + 1));
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' && value.length > 2000 ? `${value.slice(0, 2000)}...[truncated]` : value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
    if (/password|pass|token|secret|api[_-]?key|authorization|cookie|service[_-]?role/i.test(key)) {
      result[key] = '[redacted]';
    } else {
      result[key] = sanitizeLogValue(item, depth + 1);
    }
    return result;
  }, {});
}

export function normalizeOperationLogEvent(input: Record<string, unknown>, route = '/api/log'): Record<string, unknown> {
  const source = allowedSources.has(String(input.source)) ? String(input.source) : 'client';
  const level = allowedLevels.has(String(input.level)) ? String(input.level) : 'info';

  return {
    id: typeof input.id === 'string' ? input.id.slice(0, 160) : `server_${Date.now()}`,
    event: typeof input.event === 'string' ? input.event.slice(0, 160) : 'unknown.event',
    level,
    source,
    actorId: typeof input.actorId === 'string' ? input.actorId.slice(0, 160) : undefined,
    actorRole: typeof input.actorRole === 'string' ? input.actorRole.slice(0, 80) : undefined,
    requestId: typeof input.requestId === 'string' ? input.requestId.slice(0, 160) : undefined,
    route: typeof input.route === 'string' ? input.route.slice(0, 500) : route.slice(0, 500),
    message: typeof input.message === 'string' ? input.message.slice(0, 2000) : undefined,
    metadata: input.metadata ? sanitizeLogValue(input.metadata) : undefined,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };
}

export async function appendOperationLog(event: Record<string, unknown>): Promise<void> {
  await mkdir(path.dirname(logFilePath), { recursive: true });
  await appendFile(logFilePath, `${JSON.stringify(event)}\n`, 'utf8');
}

export async function handleOperationLog(request: Request, response: Response): Promise<void> {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    response.status(400).json({ ok: false, error: 'invalid_log_payload' });
    return;
  }

  if (!shouldWriteOperationLog(request.body as Record<string, unknown>)) {
    response.status(204).end();
    return;
  }

  try {
    await appendOperationLog(normalizeOperationLogEvent(request.body as Record<string, unknown>, request.originalUrl));
    response.status(204).end();
  } catch {
    response.status(500).json({ ok: false, error: 'log_write_failed' });
  }
}

export { logFilePath };
