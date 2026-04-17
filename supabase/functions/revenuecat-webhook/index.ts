import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

type JsonRecord = Record<string, unknown>;

type RevenueCatEvent = {
  id?: string;
  event_timestamp_ms?: number | string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  expiration_at_ms?: number | string | null;
  purchased_at_ms?: number | string | null;
  [key: string]: unknown;
};

type RevenueCatPayload = {
  api_version?: string;
  event?: RevenueCatEvent;
  [key: string]: unknown;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_AUTH_TOKEN = (Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN') ?? '').trim();
const WEBHOOK_SIGNING_SECRET = (
  Deno.env.get('REVENUECAT_WEBHOOK_SIGNING_SECRET') ?? ''
).trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for revenuecat-webhook.',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
]);

const INACTIVE_EVENT_TYPES = new Set([
  'EXPIRATION',
  'REFUND',
  'REVOKE',
]);

function newRequestId(): string {
  return crypto.randomUUID();
}

function logInfo(requestId: string, stage: string, data: JsonRecord = {}): void {
  console.log(
    JSON.stringify({
      level: 'info',
      request_id: requestId,
      stage,
      ...data,
    }),
  );
}

function logError(requestId: string, stage: string, data: JsonRecord = {}): void {
  console.error(
    JSON.stringify({
      level: 'error',
      request_id: requestId,
      stage,
      ...data,
    }),
  );
}

function jsonResponse(
  status: number,
  body: JsonRecord,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function normalizeSignature(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('sha256=')) {
    return trimmed.slice('sha256='.length);
  }
  return trimmed;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toHex(new Uint8Array(signed));
}

async function verifyWebhookAuth(req: Request, rawBody: string): Promise<void> {
  if (WEBHOOK_AUTH_TOKEN) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (!timingSafeEqual(authHeader, `Bearer ${WEBHOOK_AUTH_TOKEN}`)) {
      throw new Error('Unauthorized: invalid Authorization bearer token.');
    }
  }

  if (WEBHOOK_SIGNING_SECRET) {
    const headerSig =
      req.headers.get('x-revenuecat-signature') ??
      req.headers.get('x-webhook-signature') ??
      '';
    if (!headerSig) {
      throw new Error('Unauthorized: missing webhook signature header.');
    }
    const expected = await hmacSha256Hex(WEBHOOK_SIGNING_SECRET, rawBody);
    const received = normalizeSignature(headerSig);
    if (!timingSafeEqual(expected, received)) {
      throw new Error('Unauthorized: webhook signature mismatch.');
    }
  }
}

function parseMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDateIsoFromMs(value: unknown): string | null {
  const ms = parseMillis(value);
  if (ms == null) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function extractPayload(raw: unknown): RevenueCatPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid webhook payload: expected JSON object.');
  }
  return raw as RevenueCatPayload;
}

function extractEvent(payload: RevenueCatPayload): RevenueCatEvent {
  const event = payload.event;
  if (!event || typeof event !== 'object') {
    throw new Error('Invalid webhook payload: missing `event` object.');
  }
  return event;
}

function resolveAppUserId(event: RevenueCatEvent): string | null {
  const candidate =
    (typeof event.app_user_id === 'string' && event.app_user_id.trim()) ||
    (typeof event.original_app_user_id === 'string' &&
      event.original_app_user_id.trim()) ||
    null;
  return candidate;
}

function resolveEventId(payload: RevenueCatPayload, event: RevenueCatEvent): string {
  const directId =
    (typeof event.id === 'string' && event.id.trim()) ||
    (typeof payload.id === 'string' && payload.id.trim()) ||
    null;
  if (directId) return directId;
  const type = typeof event.type === 'string' ? event.type : 'UNKNOWN';
  const user = resolveAppUserId(event) ?? 'UNKNOWN_USER';
  const ts =
    parseMillis(event.event_timestamp_ms) ??
    parseMillis(event.purchased_at_ms) ??
    Date.now();
  return `${type}:${user}:${ts}`;
}

function derivePremiumState(event: RevenueCatEvent): {
  shouldUpdate: boolean;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  reason: string;
} {
  const type = typeof event.type === 'string' ? event.type : 'UNKNOWN';
  const expiresAt = parseDateIsoFromMs(event.expiration_at_ms);
  const expiresMs = parseMillis(event.expiration_at_ms);
  const now = Date.now();

  if (ACTIVE_EVENT_TYPES.has(type)) {
    return {
      shouldUpdate: true,
      isPremium: true,
      premiumExpiresAt: expiresAt,
      reason: `active_event:${type}`,
    };
  }

  if (INACTIVE_EVENT_TYPES.has(type)) {
    return {
      shouldUpdate: true,
      isPremium: false,
      premiumExpiresAt: null,
      reason: `inactive_event:${type}`,
    };
  }

  // Cancellation and billing issue can still leave access active until expiry.
  if (type === 'CANCELLATION' || type === 'BILLING_ISSUE') {
    const stillActive = expiresMs != null && expiresMs > now;
    return {
      shouldUpdate: true,
      isPremium: stillActive,
      premiumExpiresAt: stillActive ? expiresAt : null,
      reason: `grace_event:${type}`,
    };
  }

  return {
    shouldUpdate: false,
    isPremium: false,
    premiumExpiresAt: null,
    reason: `ignored_event:${type}`,
  };
}

async function markEvent(
  eventId: string,
  status: 'processed' | 'ignored' | 'failed',
  errorMessage?: string,
): Promise<void> {
  const patch: JsonRecord = {
    status,
    processed_at: new Date().toISOString(),
  };
  if (errorMessage) {
    patch.error = errorMessage.slice(0, 1500);
  }
  await supabase
    .from('revenuecat_webhook_events')
    .update(patch)
    .eq('event_id', eventId);
}

serve(async (req: Request) => {
  const requestId = newRequestId();
  logInfo(requestId, 'request.received', {
    method: req.method,
    path: new URL(req.url).pathname,
    has_auth_header: Boolean(req.headers.get('authorization')),
    has_rc_signature_header: Boolean(req.headers.get('x-revenuecat-signature')),
    has_webhook_signature_header: Boolean(req.headers.get('x-webhook-signature')),
  });

  if (req.method === 'OPTIONS') {
    logInfo(requestId, 'request.preflight');
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    logError(requestId, 'request.invalid_method', { method: req.method });
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  let eventIdForFailure: string | null = null;

  try {
    const rawBody = await req.text();
    logInfo(requestId, 'request.body_read', {
      body_length: rawBody.length,
    });

    logInfo(requestId, 'auth.verify.start', {
      auth_token_required: Boolean(WEBHOOK_AUTH_TOKEN),
      signing_secret_required: Boolean(WEBHOOK_SIGNING_SECRET),
    });
    await verifyWebhookAuth(req, rawBody);
    logInfo(requestId, 'auth.verify.success');

    logInfo(requestId, 'payload.parse.start');
    const rawPayload = JSON.parse(rawBody);
    const payload = extractPayload(rawPayload);
    const event = extractEvent(payload);
    logInfo(requestId, 'payload.parse.success', {
      api_version:
        typeof payload.api_version === 'string' ? payload.api_version : null,
    });

    const eventId = resolveEventId(payload, event);
    eventIdForFailure = eventId;
    const eventType = typeof event.type === 'string' ? event.type : 'UNKNOWN';
    const appUserId = resolveAppUserId(event);
    logInfo(requestId, 'event.resolved', {
      event_id: eventId,
      event_type: eventType,
      app_user_id: appUserId,
      original_app_user_id:
        typeof event.original_app_user_id === 'string'
          ? event.original_app_user_id
          : null,
      has_aliases: Array.isArray(event.aliases) && event.aliases.length > 0,
      expiration_at_ms: parseMillis(event.expiration_at_ms),
      purchased_at_ms: parseMillis(event.purchased_at_ms),
      event_timestamp_ms: parseMillis(event.event_timestamp_ms),
    });

    if (!appUserId) {
      logError(requestId, 'event.missing_user_id', {
        event_id: eventId,
        event_type: eventType,
      });
      return jsonResponse(400, {
        ok: false,
        error: 'Missing app_user_id/original_app_user_id in RevenueCat event.',
      });
    }

    logInfo(requestId, 'dedupe.reserve.start', {
      event_id: eventId,
      event_type: eventType,
      app_user_id: appUserId,
    });
    const reserve = await supabase.from('revenuecat_webhook_events').insert({
      event_id: eventId,
      event_type: eventType,
      app_user_id: appUserId,
      status: 'processing',
      payload,
      received_at: new Date().toISOString(),
    });

    if (reserve.error) {
      if (reserve.error.code === '23505') {
        logInfo(requestId, 'dedupe.reserve.duplicate', {
          event_id: eventId,
        });
        return jsonResponse(200, {
          ok: true,
          deduplicated: true,
          event_id: eventId,
        });
      }
      logError(requestId, 'dedupe.reserve.error', {
        event_id: eventId,
        error_code: reserve.error.code ?? null,
        error_message: reserve.error.message,
      });
      throw new Error(`Failed to reserve webhook event: ${reserve.error.message}`);
    }
    logInfo(requestId, 'dedupe.reserve.success', { event_id: eventId });

    const decision = derivePremiumState(event);
    logInfo(requestId, 'decision.computed', {
      event_id: eventId,
      should_update: decision.shouldUpdate,
      is_premium: decision.isPremium,
      premium_expires_at: decision.premiumExpiresAt,
      reason: decision.reason,
    });

    if (!decision.shouldUpdate) {
      logInfo(requestId, 'event.ignored.start', {
        event_id: eventId,
        reason: decision.reason,
      });
      await markEvent(eventId, 'ignored');
      logInfo(requestId, 'event.ignored.success', {
        event_id: eventId,
        reason: decision.reason,
      });
      return jsonResponse(200, {
        ok: true,
        ignored: true,
        event_id: eventId,
        reason: decision.reason,
      });
    }

    logInfo(requestId, 'users.update.start', {
      event_id: eventId,
      app_user_id: appUserId,
      is_premium: decision.isPremium,
      premium_expires_at: decision.premiumExpiresAt,
    });
    const updateRes = await supabase
      .from('users')
      .update({
        is_premium: decision.isPremium,
        premium_expires_at: decision.premiumExpiresAt,
      })
      .eq('id', appUserId);

    if (updateRes.error) {
      logError(requestId, 'users.update.error', {
        event_id: eventId,
        app_user_id: appUserId,
        error_code: updateRes.error.code ?? null,
        error_message: updateRes.error.message,
      });
      throw new Error(`Failed updating user premium state: ${updateRes.error.message}`);
    }
    logInfo(requestId, 'users.update.success', {
      event_id: eventId,
      app_user_id: appUserId,
    });

    logInfo(requestId, 'event.mark_processed.start', { event_id: eventId });
    await markEvent(eventId, 'processed');
    logInfo(requestId, 'event.mark_processed.success', { event_id: eventId });

    logInfo(requestId, 'request.completed', {
      event_id: eventId,
      event_type: eventType,
      app_user_id: appUserId,
      result: 'processed',
    });
    return jsonResponse(200, {
      ok: true,
      event_id: eventId,
      event_type: eventType,
      app_user_id: appUserId,
      is_premium: decision.isPremium,
      premium_expires_at: decision.premiumExpiresAt,
      reason: decision.reason,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logError(requestId, 'request.failed', {
      event_id: eventIdForFailure,
      error_message: message,
    });
    if (eventIdForFailure) {
      logInfo(requestId, 'event.mark_failed.start', { event_id: eventIdForFailure });
      await markEvent(eventIdForFailure, 'failed', message).catch(() => {});
      logInfo(requestId, 'event.mark_failed.done', { event_id: eventIdForFailure });
    }
    return jsonResponse(500, { ok: false, error: message });
  }
});

