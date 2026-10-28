import { describe, expect, it } from 'vitest';
import { MAX_MANUAL_ATTACHMENT_LENGTH } from '@dissco-cs/shared-types';

import { attachmentFileError } from '../../../../src/pages/site-management/project-management/manual-content';

const pdfBytes = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';

describe('attachmentFileError', () => {
  it('accepts a real pdf, also when the browser reports another type', async () => {
    expect(await attachmentFileError(new File([pdfBytes], 'manual.pdf', { type: 'application/pdf' }))).toBeNull();
    expect(await attachmentFileError(new File([pdfBytes], 'manual.pdf', { type: 'application/octet-stream' }))).toBeNull();
  });

  it('refuses a file that only has a .pdf name', async () => {
    const fake = new File(['just some text'], 'manual.pdf', { type: 'application/pdf' });
    expect(await attachmentFileError(fake)).toBe('sm_manuals_attachment_not_pdf');
  });

  it('refuses a file that is too large before looking at its type', async () => {
    const large = new File([new Uint8Array(MAX_MANUAL_ATTACHMENT_LENGTH + 1)], 'manual.pdf', { type: 'application/pdf' });
    expect(await attachmentFileError(large)).toBe('sm_manuals_attachment_too_large');
  });
});
