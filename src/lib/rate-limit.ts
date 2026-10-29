// A small in-memory limiter for sign-in and sign-up. On serverless each instance keeps its own
// counters, so this slows guessing rather than guaranteeing a hard global limit; a hosted store
// (Redis, Upstash) would be the next step.
type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const SIGNUP_MAX_PER_HOUR = 10;
export const SIGNUP_WINDOW_MS = 60 * 60_000;

function prune(now: number) {
  if (store.size < 5000) return;
  for (const [key, e] of store) if (e.resetAt <= now) store.delete(key);
}

/** Is this key over its limit right now? */
export function isBlocked(key: string, max: number, now = Date.now()) {
  const e = store.get(key);
  if (!e || e.resetAt <= now || e.count < max) return { blocked: false, retryAfterSec: 0 };
  return { blocked: true, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
}

/** Count one hit; the window starts at the first hit. Returns the new count. */
export function recordHit(key: string, windowMs: number, now = Date.now()) {
  prune(now);
  const e = store.get(key);
  if (!e || e.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  e.count += 1;
  return e.count;
}

export function clearKey(key: string) {
  store.delete(key);
}
