const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * Whether a value is safe to put into a Madoc URL path: only letters, digits, '_' and '-'. A
 * crafted id such as `..` or `a/b` could otherwise reach a different Madoc route than intended.
 * @param value the id or slug to check; may be undefined
 * Returns: true, and narrows the type to string, when it is safe.
 */
export function isSafeSegment(value: string | undefined): value is string {
  return typeof value === 'string' && SAFE_SEGMENT.test(value);
}

/**
 * Builds a Madoc path and checks every inserted value with isSafeSegment on the way, so a call
 * cannot forget the check: madocPath`/api/tasks/${taskId}/stats`. Path only; a query string goes
 * separately (MadocRequest.query in client.ts). Routes already check their params with
 * validateParams for a clean 400 -- this is the safety net if one slipped through.
 * @param strings the fixed parts of the template
 * @param values the inserted ids
 * Returns: the path. Throws when an inserted value is not safe.
 */
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
