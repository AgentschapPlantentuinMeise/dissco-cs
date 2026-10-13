const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

// Every value interpolated into a Madoc path must pass this first, so a crafted id (e.g. `..`)
// can never reach a different Madoc route than the one the handler intends.
export function isSafeSegment(value: string | undefined): value is string {
  return typeof value === 'string' && SAFE_SEGMENT.test(value);
}

// Builds a Madoc path and validates every interpolated value on the way, so a call can't forget
// the check: madocPath`/api/tasks/${taskId}/stats`. Path only -- the query string goes separately
// (see MadocRequest.query in client.ts). Controllers still check route params with isSafeSegment
// themselves to answer a clean 400; this throws if one slipped through anyway.
export function madocPath(strings: TemplateStringsArray, ...values: Array<string | number>): string {
  return strings.reduce((path, part, i) => {
    if (i === 0) {
      return part;
    }
    const value = String(values[i - 1]);
    if (!isSafeSegment(value)) {
      throw new Error('Unsafe path segment for Madoc path');
    }
    return path + value + part;
  }, '');
}
