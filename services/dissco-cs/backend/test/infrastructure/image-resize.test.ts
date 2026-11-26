import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { shrinkImage } from '../../src/infrastructure/image-resize.js';

// A plain PNG of the given size; with alpha, its pixels are half transparent.
function png(width: number, height: number, alpha = false): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: alpha ? 4 : 3, background: alpha ? { r: 0, g: 128, b: 128, alpha: 0.5 } : '#008080' },
  })
    .png()
    .toBuffer();
}

describe('shrinkImage', () => {
  it('shrinks a large logo to fit within 800 px, as WebP', async () => {
    const result = await shrinkImage(await png(3000, 1500), 'logo');
    const meta = await sharp(result.buffer).metadata();
    expect(result.mimeType).toBe('image/webp');
    expect(meta.format).toBe('webp');
    expect([meta.width, meta.height]).toEqual([800, 400]);
  });

  it('shrinks a large photo to fit within 2000 px', async () => {
    const meta = await sharp((await shrinkImage(await png(1500, 4000), 'photo')).buffer).metadata();
    expect([meta.width, meta.height]).toEqual([750, 2000]);
  });

  it('never enlarges a small image', async () => {
    const meta = await sharp((await shrinkImage(await png(120, 60), 'photo')).buffer).metadata();
    expect([meta.width, meta.height]).toEqual([120, 60]);
  });

  it('keeps transparency', async () => {
    const meta = await sharp((await shrinkImage(await png(200, 200, true), 'logo')).buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });
});
