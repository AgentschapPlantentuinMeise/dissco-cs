import { describe, expect, it } from 'vitest';

import { ATTACHMENT_MARKER, splitBodyAroundMarker, splitIntoSections, toEmbedUrl } from '../../../src/components/manuals/manual-sections';

describe('splitIntoSections', () => {
  it('splits at every ## heading and keeps an intro without heading', () => {
    const sections = splitIntoSections('Intro\n## First\nOne\n## Second\nTwo');
    expect(sections).toEqual([
      { heading: null, body: 'Intro\n' },
      { heading: 'First', body: 'One\n' },
      { heading: 'Second', body: 'Two\n' },
    ]);
  });

  it('drops an empty intro but keeps an empty headed section', () => {
    expect(splitIntoSections('\n\n## Only\n')).toEqual([{ heading: 'Only', body: '\n' }]);
  });

  it('does not treat ### as a section heading', () => {
    expect(splitIntoSections('## A\n### Sub\ntext')).toEqual([{ heading: 'A', body: '### Sub\ntext\n' }]);
  });

  it('returns nothing for empty content', () => {
    expect(splitIntoSections('')).toEqual([]);
  });
});

describe('toEmbedUrl', () => {
  it('turns YouTube and Vimeo links into embed urls', () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=abc_12-3')).toBe('https://www.youtube.com/embed/abc_12-3');
    expect(toEmbedUrl('https://youtu.be/xyz')).toBe('https://www.youtube.com/embed/xyz');
    expect(toEmbedUrl('https://vimeo.com/123456')).toBe('https://player.vimeo.com/video/123456');
  });

  it('leaves other links alone', () => {
    expect(toEmbedUrl('https://example.org/page')).toBeNull();
  });
});

describe('splitBodyAroundMarker', () => {
  it('returns the text before and after the marker', () => {
    expect(splitBodyAroundMarker(`Before\n${ATTACHMENT_MARKER}\nAfter`)).toEqual(['Before\n', '\nAfter']);
  });
});
