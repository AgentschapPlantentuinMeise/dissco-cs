import { ManualAttachmentDto, ManualDetailDto, ManualDto, ManualSummaryDto, PerLanguage } from '@dissco-cs/shared-types';
import { ManualAttachmentMeta, ManualRow, ManualSummary } from '../repositories/manuals.repository.js';

// site_id is site scoping, never part of the wire DTO.
export function toManualDto(row: ManualRow): ManualDto {
  return { id: row.id, title: row.title, content: row.content, updated_at: row.updated_at.toISOString() };
}

export function toManualSummaryDto(summary: ManualSummary): ManualSummaryDto {
  return { ...toManualDto(summary), linkedProjectSlugs: summary.linkedProjectSlugs, attachmentLangs: summary.attachmentLangs };
}

// Shared by the admin (GET /manuals/:manualId) and volunteer-facing (GET /projects/:projectId/manual)
// detail routes.
export function toManualDetailDto(manual: ManualRow, attachmentMeta: ManualAttachmentMeta[]): ManualDetailDto {
  const attachments: PerLanguage<ManualAttachmentDto> = {};
  for (const meta of attachmentMeta) {
    attachments[meta.lang] = { filename: meta.filename, mimeType: meta.mime_type, size: meta.file_size };
  }

  return { id: manual.id, title: manual.title, content: manual.content, attachments };
}
