import { isEqual, isPlainObject } from 'lodash-es';

const isBlank = (value: unknown) => value === '' || value === null || value === undefined;

// An empty text counts as "not filled in", so typing something and erasing it again is no change.
// null and undefined do stay different: null in a manual's draft means "remove the stored attachment".
function isSameValue(a: unknown, b: unknown): boolean {
  if (a === '' || b === '') return isBlank(a) && isBlank(b);
  if (isPlainObject(a) && isPlainObject(b)) {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    return [...Object.keys(left), ...Object.keys(right)].every(key => isSameValue(left[key], right[key]));
  }
  return isEqual(a, b);
}

export function hasDraftChanged(current: unknown, initial: unknown): boolean {
  return !isSameValue(current, initial);
}
