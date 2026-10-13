const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

// Every value interpolated into a Madoc path must pass this first, so a crafted id (e.g. `..`)
// can never reach a different Madoc route than the one the handler intends.
export function isSafeSegment(value: string | undefined): value is string {
  return typeof value === 'string' && SAFE_SEGMENT.test(value);
}

// Safety net inside the madoc-client helpers that call Madoc with the service JWT: controllers
// already answer 400 for an invalid route param, so this only fires if a caller forgot that check.
export function assertSafeSegment(value: string, label: string): void {
  if (!isSafeSegment(value)) {
    throw new Error(`Unsafe ${label} for Madoc path`);
  }
}
