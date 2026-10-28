import { describe, expect, it } from 'vitest';
import { MANUAL_ATTACHMENT_MIME_TYPES, SITE_IMAGE_MIME_TYPES } from '@dissco-cs/shared-types';

import { detectFileType } from '../../src/infrastructure/file-http';

const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]), Buffer.alloc(64)]);
const html = Buffer.from('<html><body><script>alert(1)</script></body></html>');

describe('detectFileType', () => {
  it('recognises a PDF from its content', async () => {
    expect(await detectFileType(pdf, MANUAL_ATTACHMENT_MIME_TYPES)).toBe('application/pdf');
  });

  it('refuses a file that is not a PDF, whatever its name or reported type', async () => {
    expect(await detectFileType(html, MANUAL_ATTACHMENT_MIME_TYPES)).toBeNull();
    expect(await detectFileType(jpeg, MANUAL_ATTACHMENT_MIME_TYPES)).toBeNull();
  });

  it('accepts a JPEG as a site image, but not a PDF', async () => {
    expect(await detectFileType(jpeg, SITE_IMAGE_MIME_TYPES)).toBe('image/jpeg');
    expect(await detectFileType(pdf, SITE_IMAGE_MIME_TYPES)).toBeNull();
  });
});
