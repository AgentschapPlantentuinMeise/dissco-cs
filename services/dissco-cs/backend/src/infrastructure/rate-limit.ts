// Client identity for the hono-rate-limiter middleware on public routes. Those limiters use the
// library's default in-memory store: counts live in this process and reset on restart. Once the
// service runs as more than one replica, give each limiter a shared store (e.g. RedisStore).

export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwardedFor = c.req.header('x-forwarded-for');
  return c.req.header('x-real-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
}
