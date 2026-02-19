import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Community Update Edge Function
 *
 * Two modes of operation:
 *
 * 1. MANUAL (POST with reflection_id):
 *    You select a reflection to feature. The function marks it as featured
 *    and sends a push notification to all users with community_updates enabled.
 *
 *    POST body: { "reflection_id": "uuid-here" }
 *
 * 2. AUTO (POST without reflection_id):
 *    Automatically picks the most-viewed live/completed reflection from
 *    the last 24 hours and features it.
 *
 *    POST body: {} or { "auto": true }
 *
 * To trigger manually, you can call this from:
 *   - Supabase Dashboard > Edge Functions > community-update > Invoke
 *   - curl with your service role key
 *   - A future admin panel
 */
serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    let reflectionId = body.reflection_id;
    let reflection: any = null;

    if (reflectionId) {
      // Manual mode: fetch the specified reflection
      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .eq('id', reflectionId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Reflection not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      reflection = data;
    } else {
      // Auto mode: pick the most-viewed reflection from the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .in('status', ['live', 'completed'])
        .gte('created_at', oneDayAgo)
        .eq('is_fake', false)
        .eq('is_featured', false)
        .order('viewer_count', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: true, message: 'No eligible reflections to feature', sent: 0 }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      reflection = data;
      reflectionId = data.id;
    }

    // Mark the reflection as featured
    await supabase
      .from('reflections')
      .update({ is_featured: true, featured_at: new Date().toISOString() })
      .eq('id', reflectionId);

    // Get all users who want community updates
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_community_update_recipients');

    if (recipientsError) {
      console.error('Error fetching community update recipients:', recipientsError);
      return new Response(
        JSON.stringify({ error: recipientsError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients opted in to community updates', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build a preview of the reflection for the notification
    const preview = reflection.generated_text
      ? reflection.generated_text.substring(0, 100) + '...'
      : reflection.input_text?.substring(0, 100) + '...';

    const title = 'Featured Community Reflection ✨';
    const notifBody = `"${preview}"`;

    const messages = recipients.map((r: any) => ({
      to: r.push_token,
      title,
      body: notifBody,
      data: { type: 'community_update', reflection_id: reflectionId },
    }));

    const logEntries = recipients.map((r: any) => ({
      user_id: r.user_id,
      notification_type: 'community_update',
      title,
      body: notifBody,
      metadata: { reflection_id: reflectionId },
    }));

    // Send via the shared push notification function
    const { data: sendResult, error: sendError } = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: { messages, log_entries: logEntries },
      }
    );

    if (sendError) {
      console.error('Error sending community update:', sendError);
      return new Response(
        JSON.stringify({ error: sendError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        featured_reflection_id: reflectionId,
        recipients: recipients.length,
        result: sendResult,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Community update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
