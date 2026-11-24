import { describe, expect, it } from 'vitest';
import { madocProjectVisibility } from '@dissco-cs/shared-types';

describe('madocProjectVisibility', () => {
  it('treats active and completed projects as published', () => {
    expect(madocProjectVisibility(1)).toBe('published');
    expect(madocProjectVisibility(2)).toBe('published');
  });

  it('treats paused and prepared projects, such as a template, as unpublished', () => {
    expect(madocProjectVisibility(0)).toBe('unpublished');
    expect(madocProjectVisibility(4)).toBe('unpublished');
  });

  it('keeps archived apart', () => {
    expect(madocProjectVisibility(3)).toBe('archived');
  });
});
