import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveInside } from '../../src/infrastructure/file-store';

describe('resolveInside', () => {
  const root = resolve('files-root');

  it('turns a key into a path inside the files folder', () => {
    expect(resolveInside(root, 'manuals/12/nl')).toBe(join(root, 'manuals', '12', 'nl'));
  });

  it('refuses a key that climbs out of the files folder', () => {
    expect(() => resolveInside(root, '../secret')).toThrow();
    expect(() => resolveInside(root, 'manuals/../../secret')).toThrow();
  });

  it('refuses a folder next to it whose name starts the same', () => {
    expect(() => resolveInside(root, '../files-root-other/x')).toThrow();
  });

  it('refuses the files folder itself', () => {
    expect(() => resolveInside(root, '')).toThrow();
  });
});
