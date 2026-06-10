import { Redis } from '@upstash/redis';

// Edge runtime: @upstash/redis is REST/fetch-based, so it runs here with no Node deps.
export const config = { runtime: 'edge' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RL_LIMIT = 5; // max requests
const RL_WINDOW = 60; // seconds

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405, { Allow: 'POST' });
  if (!(req.headers.get('content-type') || '').includes('application/json')) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  let data: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object');
    data = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Honeypot: a real user never fills this. Pretend success, store nothing.
  if (typeof data.hp === 'string' && data.hp.trim() !== '') {
    return json({ ok: true, already: false });
  }

  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400);
  }

  // Instantiate per-request (avoids import-time throw if env is absent at build).
  const redis = Redis.fromEnv();

  // Per-IP rate limit. Note: x-forwarded-for is set by Vercel's proxy in prod, but is
  // caller-spoofable if the proxy is bypassed — adequate for a launch waitlist, not a hard gate.
  // Fail open if the store hiccups — never block a real signup.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  try {
    const rlKey = `rl:waitlist:${ip}`;
    const hits = await redis.incr(rlKey);
    await redis.expire(rlKey, RL_WINDOW); // unconditional + idempotent: self-heals the TTL
    if (hits > RL_LIMIT) return json({ ok: false, error: 'rate_limited' }, 429);
  } catch {
    // ignore rate-limit store errors
  }

  try {
    const added = await redis.sadd('waitlist:emails', email); // 1 = new, 0 = duplicate
    if (added === 1) {
      await redis.lpush(
        'waitlist:log',
        JSON.stringify({ email, ts: Date.now(), ua: req.headers.get('user-agent') || '' }),
      );
    }
    return json({ ok: true, already: added === 0 });
  } catch {
    return json({ ok: false, error: 'server' }, 500);
  }
}
