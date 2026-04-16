import { registerPushTokenWithSupabase } from './messaging';

/** @deprecated Use `registerPushTokenWithSupabase` from `./messaging` (same behavior). */
export async function registerPushDeviceWithSupabase(): Promise<
  { ok: true; token: string } | { ok: false; message: string }
> {
  return registerPushTokenWithSupabase();
}
