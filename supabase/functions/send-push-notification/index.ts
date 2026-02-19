import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

/**
 * Shared Edge Function for sending Expo push notifications.
 * Called by other Edge Functions (streak-reminder, community-update)
 * or directly via HTTP for manual/admin sends.
 *
 * POST body:
 * {
 *   "messages": [{ "to": "ExponentPushToken[...]", "title": "...", "body": "..." }]
 *   "log_entries": [{ "user_id": "...", "notification_type": "...", "title": "...", "body": "..." }]
 * }
 */
serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { messages, log_entries } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send to Expo Push API in batches of 100
    const results = [];
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch.map((m: PushMessage) => ({
          to: m.to,
          title: m.title,
          body: m.body,
          sound: m.sound || 'default',
          data: m.data || {},
        }))),
      });

      const result = await response.json();
      results.push(...(result.data || []));
    }

    // Log sent notifications to the database
    if (log_entries && log_entries.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const logRows = log_entries.map((entry: any, idx: number) => ({
        user_id: entry.user_id,
        notification_type: entry.notification_type,
        title: entry.title,
        body: entry.body,
        expo_ticket_id: results[idx]?.id || null,
        status: results[idx]?.status === 'ok' ? 'sent' : 'failed',
        metadata: entry.metadata || {},
      }));

      await supabase.from('notification_log').insert(logRows);
    }

    return new Response(
      JSON.stringify({ success: true, sent: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
