/**
 * Helper partagé : trace les tentatives d'envoi push dans push_delivery_logs
 * et gère la file fallback push_pending_queue.
 *
 * Utilise service_role (contourne RLS).
 */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface PushLogEntry {
  user_id: string | null;
  channel: 'web' | 'fcm' | 'apns' | 'db' | 'test';
  notification_type?: string;
  title?: string;
  body?: string;
  token_preview?: string;
  success: boolean;
  status_code?: number;
  error_reason?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

let _client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (_client) return _client;
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  _client = createClient(url, key);
  return _client;
}

export async function logPushAttempt(entry: PushLogEntry): Promise<void> {
  try {
    await admin().from('push_delivery_logs').insert({
      user_id: entry.user_id,
      channel: entry.channel,
      notification_type: entry.notification_type ?? null,
      title: entry.title ?? null,
      body: entry.body ?? null,
      token_preview: entry.token_preview ?? null,
      success: entry.success,
      status_code: entry.status_code ?? null,
      error_reason: entry.error_reason ?? null,
      request_id: entry.request_id ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.warn('[pushLogger] insert failed', e);
  }
}

export async function enqueuePendingPush(params: {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  error: string;
}): Promise<void> {
  try {
    await admin().from('push_pending_queue').insert({
      user_id: params.user_id,
      notification_type: params.notification_type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
      last_error: params.error,
    });
  } catch (e) {
    console.warn('[pushLogger] enqueue failed', e);
  }
}

export function previewToken(token: string | undefined | null): string {
  if (!token) return '';
  return token.length > 24 ? token.slice(0, 24) + '…' : token;
}
