import { isSupabaseEnabled, supabase } from './supabaseData';

const AUDIT_STORAGE_KEY = 'warroom_audit_log_buffer_v1';
const MAX_LOCAL_EVENTS = 500;
const SERVER_LOG_ENDPOINT = '/api/log';

export type AuditLevel = 'info' | 'warning' | 'error' | 'security';

export interface AuditEvent {
  id: string;
  event: string;
  level: AuditLevel;
  source: 'client' | 'server';
  actorId?: string;
  actorRole?: string;
  requestId?: string;
  route?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const SENSITIVE_KEYS = /password|pass|token|secret|api[_-]?key|authorization|cookie|service[_-]?role/i;

export function shouldRecordAuditEvent(input: Pick<AuditEvent, 'event' | 'level'>): boolean {
  const eventName = input.event.toLowerCase();
  const isAuthEvent = /(^|[._-])(auth|login|logout|register|registration|password_reset)([._-]|$)/.test(eventName);
  const isRequestEvent = /(^|[._-])(request|submission|ticket|join|merge|transfer|payment)([._-]|$)/.test(eventName);
  const isErrorEvent = input.level === 'error' || input.level === 'warning';
  return isAuthEvent || isRequestEvent || isErrorEvent;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 50).map(item => sanitize(item, depth + 1));
  if (!value || typeof value !== 'object') return typeof value === 'string' && value.length > 1000 ? `${value.slice(0, 1000)}...[truncated]` : value;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
    result[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : sanitize(item, depth + 1);
    return result;
  }, {});
}

function readLocalEvents(): AuditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalEvent(event: AuditEvent): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([...readLocalEvents(), event].slice(-MAX_LOCAL_EVENTS)));
  } catch {
    // Diagnostics must never break the user flow.
  }
}

function forwardEventToServer(event: AuditEvent): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;

  void fetch(SERVER_LOG_ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // The server endpoint is optional in local Vite-only development.
  });
}

export async function logAudit(input: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent> {
  const event: AuditEvent = {
    ...input,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    metadata: input.metadata ? sanitize(input.metadata) as Record<string, unknown> : undefined,
  };

  if (!shouldRecordAuditEvent(event)) return event;

  writeLocalEvent(event);
  forwardEventToServer(event);

  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('warroom_audit_log').upsert({
        id: event.id,
        data: event,
        updated_at: event.createdAt,
      });
      if (error) console.warn('[WarRoom Audit] Supabase write failed:', error.message);
    } catch (error) {
      console.warn('[WarRoom Audit] Supabase write failed:', error);
    }
  }

  return event;
}

export function getLocalAuditEvents(): AuditEvent[] {
  return readLocalEvents();
}

export function exportAuditLog(): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(readLocalEvents(), null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `warroom-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function installGlobalErrorAudit(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onError = (event: ErrorEvent) => {
    void logAudit({
      event: 'client.unhandled_error',
      level: 'error',
      source: 'client',
      route: window.location.pathname,
      message: event.message,
      metadata: { filename: event.filename, line: event.lineno, column: event.colno },
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    void logAudit({
      event: 'client.unhandled_rejection',
      level: 'error',
      source: 'client',
      route: window.location.pathname,
      message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}