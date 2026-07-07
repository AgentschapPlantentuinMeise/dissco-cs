const attemptsByKey = new Map();
/**
 * Minimal in-memory rate limiter. Resets on restart and is per-instance only —
 * good enough to blunt basic spam/abuse, not a substitute for a shared store
 * if this service is ever scaled to multiple replicas.
 */
export function isRateLimited(key, maxAttempts, windowMs) {
    const now = Date.now();
    const attempts = (attemptsByKey.get(key) ?? []).filter(time => now - time < windowMs);
    if (attempts.length >= maxAttempts) {
        attemptsByKey.set(key, attempts);
        return true;
    }
    attempts.push(now);
    attemptsByKey.set(key, attempts);
    return false;
}
