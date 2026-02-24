import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header format' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const accessToken = authHeader.slice(7).trim();

    // Identify the caller from their JWT.
    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Reflections use ON DELETE SET NULL for user_id, so explicitly remove
    // user-authored rows to ensure account deletion removes user content.
    const { error: reflectionDeleteError } = await adminClient
      .from('reflections')
      .delete()
      .eq('user_id', authData.user.id);

    if (reflectionDeleteError) {
      return new Response(
        JSON.stringify({ error: reflectionDeleteError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id, false);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
