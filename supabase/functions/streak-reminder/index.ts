import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Streak Reminder Edge Function
 *
 * Triggered by pg_cron EVERY HOUR. The database function filters
 * for users whose local time is currently 6 PM, so each timezone
 * gets their reminder at 6 PM local time.
 *
 * Finds users who:
 *   1. Have streak_reminder enabled
 *   2. Have a current streak > 0
 *   3. Have NOT completed today's journey
 *   4. Haven't already received a streak reminder today
 *   5. Whose local time is currently 6 PM
 *
 * Sends them a push notification encouraging them to maintain their streak.
 */

const STREAK_MESSAGES = [
  (streak: number) => `You're on a ${streak}-day streak! Don't let it slip — complete today's journey.`,
  (streak: number) => `${streak} days strong. A few minutes is all it takes to keep your streak alive.`,
  (streak: number) => `Your ${streak}-day streak is waiting. The Stoics practiced daily — so can you.`,
  (streak: number) => `Don't break the chain! You've built ${streak} days of wisdom. Keep going.`,
  (streak: number) => `${streak} days of growth. Open Seneca and keep the momentum going.`,
];

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Allow overriding the target hour via request body (default: 18 = 6 PM)
    const body = await req.json().catch(() => ({}));
    const targetHour = body.target_hour ?? 18;

    // Get users whose local time is currently the target hour
    const { data: recipients, error } = await supabase
      .rpc('get_streak_reminder_recipients', { target_hour: targetHour });

    if (error) {
      console.error('Error fetching streak reminder recipients:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients need streak reminders this hour', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build push messages
    const messageIndex = new Date().getDate() % STREAK_MESSAGES.length;
    const messages = recipients.map((r: any) => ({
      to: r.push_token,
      title: "Don't lose your streak! 🔥",
      body: STREAK_MESSAGES[messageIndex](r.current_streak),
      data: { type: 'streak_reminder' },
    }));

    const logEntries = recipients.map((r: any) => ({
      user_id: r.user_id,
      notification_type: 'streak_reminder',
      title: "Don't lose your streak! 🔥",
      body: STREAK_MESSAGES[messageIndex](r.current_streak),
      metadata: { current_streak: r.current_streak, timezone: r.timezone },
    }));

    // Call the send-push-notification function
    const { data: sendResult, error: sendError } = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: { messages, log_entries: logEntries },
      }
    );

    if (sendError) {
      console.error('Error sending streak reminders:', sendError);
      return new Response(
        JSON.stringify({ error: sendError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        target_hour: targetHour,
        recipients: recipients.length,
        result: sendResult,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Streak reminder error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
