import { describe, expect, it } from 'vitest';

import { projectImageUrl } from '../../src/utility/project-image-url';

describe('projectImageUrl', () => {
  it('reads a thumbnail given as a URL', () => {
    expect(projectImageUrl({ thumbnail: 'https://x/a.jpg' })).toBe('https://x/a.jpg');
  });

  it('reads a thumbnail given as an object with the URL as id', () => {
    expect(projectImageUrl({ thumbnail: { id: 'https://x/b.jpg' } })).toBe('https://x/b.jpg');
  });

  it('falls back to placeholderImage, which a single project has instead', () => {
    expect(projectImageUrl({ placeholderImage: 'https://x/c.jpg' })).toBe('https://x/c.jpg');
  });

  it('is undefined without any image', () => {
    expect(projectImageUrl({})).toBeUndefined();
  });
});
