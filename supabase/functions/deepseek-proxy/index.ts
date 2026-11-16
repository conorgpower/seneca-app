// deepseek-proxy
// The only place the DeepSeek API key lives. The app calls this function with
// the user's Supabase session; it checks auth, enforces daily limits, trims
// chat history, calls DeepSeek, and logs token usage per user to ai_usage_log.
//
// Secrets (supabase secrets set ...):
//   DEEPSEEK_API_KEY      required
//   DEEPSEEK_MODEL        optional, default 'deepseek-chat'
//   DAILY_CHAT_LIMIT      optional, default 60 messages / user / 24h
//   DAILY_REFLECTION_LIMIT optional, default 10 / user / 24h

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-chat';
const DAILY_LIMITS: Record<Feature, number> = {
  chat: Number(Deno.env.get('DAILY_CHAT_LIMIT') ?? 60),
  reflection: Number(Deno.env.get('DAILY_REFLECTION_LIMIT') ?? 10),
};

// Chat: only the most recent turns are sent, and each is capped in length.
const MAX_HISTORY_MESSAGES = 10; // 5 user/assistant exchanges
const MAX_MESSAGE_CHARS = 2000;
const MAX_CONTEXT_CHARS = 3000;
const MAX_HINT_CHARS = 500;
const MAX_AVOID_QUOTES = 5;

type Feature = 'chat' | 'reflection';
type Role = 'user' | 'assistant';
interface ChatTurn { role: Role; content: string }

const CHAT_SYSTEM_PROMPT = `You are Seneca, a wise philosophical guide drawing upon the wisdom of ancient and modern philosophy. You embody the teachings of Stoic philosophers like Marcus Aurelius, Epictetus, and Seneca the Younger, as well as insights from Nietzsche, Plato, Aristotle, and other great thinkers.

Your purpose is to:
- Help people navigate life's challenges with philosophical wisdom
- Provide practical, actionable advice grounded in philosophical principles
- Quote relevant passages from philosophical texts when appropriate
- Encourage self-reflection and the examined life
- Speak in a warm, accessible tone while maintaining philosophical depth

When responding:
- Keep replies SHORT — aim for 2-4 sentences. Avoid long paragraphs or lists.
- Be concise yet profound — say more with fewer words
- Use Socratic questioning to deepen understanding
- Relate ancient wisdom to modern challenges
- Encourage virtue, resilience, and rational thinking
- Acknowledge human struggles with compassion
- Only include ONE quote per response, if any — don't stack multiple quotes
- IMPORTANT: Never repeat the same quote or passage twice in a conversation. If you've already shared a quote, reference it in different words or use a completely different quote.
- Always end your response with a question or reflective prompt that invites the user to continue the conversation. Keep the conversation flowing naturally.`;

const REFLECTION_SYSTEM_PROMPT = `You are a wise Stoic philosopher and guide. Your role is to take a person's brief thought or feeling and expand it into a meaningful, practical reflection rooted in Stoic philosophy.

Your reflections should:
- Be 2-3 short paragraphs (300-500 words total)
- Focus on Stoic principles: virtue, acceptance, what is in our control vs what is not
- Provide practical wisdom and actionable insights
- Be warm, compassionate, and encouraging
- Help the person find peace, clarity, or strength
- Reference Stoic concepts naturally without being preachy

Write in a calm, thoughtful tone. Make the reflection personal and relevant to their specific thought.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

function buildChatMessages(body: Record<string, unknown>) {
  const message = str(body.message, MAX_MESSAGE_CHARS);
  if (!message) throw new Error('Message cannot be empty');

  const hint = str(body.personalizationHint, MAX_HINT_CHARS);
  const context = str(body.context, MAX_CONTEXT_CHARS);
  const avoidQuotes = Array.isArray(body.avoidQuotes)
    ? body.avoidQuotes.slice(0, MAX_AVOID_QUOTES).map((q) => str(q, 200)).filter(Boolean)
    : [];

  let system = CHAT_SYSTEM_PROMPT;
  if (hint) {
    system += `\n\nLight personalization (optional, only when relevant to the user's current message):\n${hint}\n\nDo not force this context into every reply.`;
  }
  if (avoidQuotes.length) {
    system += `\n\nYou have already shared these quotes in this conversation - do not repeat them: ${avoidQuotes.join('; ')}`;
  }

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history: ChatTurn[] = rawHistory
    .filter((m): m is ChatTurn =>
      !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  // The passage is attached to the current turn only; it is never stored in history.
  const current = context ? `Context: ${context}\n\nUser: ${message}` : message;

  return {
    messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: current }],
    maxTokens: 250,
    historyCount: history.length,
  };
}

function buildReflectionMessages(body: Record<string, unknown>) {
  const input = typeof body.inputText === 'string' ? body.inputText.trim() : '';
  if (!input) throw new Error('Input text cannot be empty');
  if (input.length > 200) throw new Error('Input text cannot exceed 200 characters');
  const hint = str(body.personalizationHint, MAX_HINT_CHARS);

  return {
    messages: [
      { role: 'system', content: REFLECTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${hint ? `Light profile context (optional, use only if relevant): ${hint}\n\n` : ''}Please create a Stoic reflection based on this thought: "${input}"`,
      },
    ],
    maxTokens: 500,
    historyCount: 0,
  };
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) return json({ error: 'AI service not configured' }, 500);

  // --- Auth ---
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: authData, error: authError } = await userClient.auth.getUser(
    authHeader.slice(7).trim(),
  );
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = authData.user.id;

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // --- Parse request ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const feature = body.feature as Feature;
  if (feature !== 'chat' && feature !== 'reflection') {
    return json({ error: 'Unknown feature' }, 400);
  }

  let built;
  try {
    built = feature === 'chat' ? buildChatMessages(body) : buildReflectionMessages(body);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const log = (row: Record<string, unknown>) =>
    admin.from('ai_usage_log').insert({
      user_id: userId,
      feature,
      model_requested: MODEL,
      history_messages: built.historyCount,
      ...row,
    }).then(({ error }) => error && console.error('usage log insert failed:', error));

  // --- Daily limit (rolling 24h) ---
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from('ai_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('status', 'ok')
    .gte('created_at', since);
  if (countError) console.error('limit check failed:', countError);
  if ((count ?? 0) >= DAILY_LIMITS[feature]) {
    await log({ status: 'rate_limited' });
    return json({ error: 'daily_limit_reached', limit: DAILY_LIMITS[feature] }, 429);
  }

  // --- Call DeepSeek ---
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: built.messages,
        temperature: 0.7,
        max_tokens: built.maxTokens,
      }),
    });

    if (!res.ok) {
      console.error('DeepSeek error', res.status, await res.text());
      await log({ status: 'error' });
      return json({ error: 'AI service error' }, res.status === 429 ? 503 : 502);
    }

    const data = await res.json();
    const content: string | undefined = data.choices?.[0]?.message?.content;
    const usage = data.usage ?? {};
    await log({
      status: 'ok',
      model_returned: data.model ?? null,
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      cache_hit_tokens: usage.prompt_cache_hit_tokens ?? 0,
      cache_miss_tokens: usage.prompt_cache_miss_tokens ?? 0,
    });

    if (!content) return json({ error: 'No response generated' }, 502);
    return json({ content: content.trim() });
  } catch (e) {
    console.error('deepseek-proxy failure:', e);
    await log({ status: 'error' });
    return json({ error: 'AI service error' }, 502);
  }
});
