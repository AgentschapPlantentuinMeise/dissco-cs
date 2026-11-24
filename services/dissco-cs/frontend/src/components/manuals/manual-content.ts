import { MANUAL_ATTACHMENT_MIME_TYPES, ManualSummaryDto, attachmentFileSchema, checkManualContent } from '@dissco-cs/shared-types';

export type AttachmentFileError = 'sm_manuals_attachment_too_large' | 'sm_manuals_attachment_not_pdf';

// Checks a picked attachment before Save, the way the server will: the size, then the type read
// from the file's first bytes (a real PDF can arrive with file.type application/octet-stream).
// file-type is loaded only when an admin picks a file, so it stays out of the visitors' bundle.
export async function attachmentFileError(file: File): Promise<AttachmentFileError | null> {
  if (!attachmentFileSchema.safeParse(file).success) {
    return 'sm_manuals_attachment_too_large';
  }
  const { fileTypeFromBlob } = await import('file-type');
  const type = await fileTypeFromBlob(file);
  return type && (MANUAL_ATTACHMENT_MIME_TYPES as readonly string[]).includes(type.mime) ? null : 'sm_manuals_attachment_not_pdf';
}

// Whether a manual may be linked to a project. Only the content counts: a manual whose title is
// not yet in every language still shows a title (the first filled one).
export function manualHasContent(manual: ManualSummaryDto): boolean {
  const check = checkManualContent(manual.content, manual.attachmentLangs);
  return check.hasContent && check.missingLangs.length === 0;
}
