import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

const REDACT = '[redacted]';

function redactSensitiveJson(raw: string, maxLen: number): string {
  try {
    const o = JSON.parse(raw) as unknown;
    const walk = (v: unknown): unknown => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const out: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          if (
            /password|refresh_token|access_token|token_hash|secret/i.test(k)
          ) {
            out[k] = REDACT;
          } else {
            out[k] = walk(val);
          }
        }
        return out;
      }
      if (Array.isArray(v)) {
        return v.map(walk);
      }
      return v;
    };
    const s = JSON.stringify(walk(o));
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
  }
}

type LoggableHeaders =
  | Headers
  | Record<string, string>
  | [string, string][]
  | undefined;

function headerSnapshot(headers: LoggableHeaders): Record<string, string> {
  if (!headers) {
    return {};
  }
  const out: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      out[key] =
        lower === 'authorization' ||
        lower === 'apikey' ||
        lower === 'x-supabase-key'
          ? REDACT
          : value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      const lower = key.toLowerCase();
      out[key] = /authorization|apikey|x-supabase-key/i.test(lower)
        ? REDACT
        : value;
    }
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    out[key] = /authorization|apikey|x-supabase-key/i.test(lower)
      ? REDACT
      : String(value);
  }
  return out;
}

function createLoggingFetch(baseFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : typeof Request !== 'undefined' && input instanceof Request
            ? input.url
            : 'url';
    const method = init?.method ?? 'GET';
    let bodyLog: string | undefined;
    if (init?.body != null) {
      if (typeof init.body === 'string') {
        bodyLog = redactSensitiveJson(init.body, 8000);
      } else {
        bodyLog = `[body: ${Object.prototype.toString.call(init.body)}]`;
      }
    }
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[supabase:api:request]', {
        method,
        url,
        headers: headerSnapshot(init?.headers),
        body: bodyLog,
      });
    }

    const res = await baseFetch(input, init);

    if (__DEV__) {
      const clone = res.clone();
      void clone
        .text()
        .then(text => {
          const data = redactSensitiveJson(text, 12000);
          // eslint-disable-next-line no-console
          console.log('[supabase:api:response]', {
            status: res.status,
            url,
            data,
          });
        })
        .catch(() => {
          // eslint-disable-next-line no-console
          console.log('[supabase:api:response]', {
            status: res.status,
            url,
            data: '[unreadable body]',
          });
        });
    }

    return res;
  };
}

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        fetch: createLoggingFetch(fetch),
      },
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
