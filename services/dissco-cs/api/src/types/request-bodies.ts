// Unvalidated JSON request-body shapes for dissco-cs's own routes -- every field is `unknown`
// on purpose, the corresponding parse*/is* functions in validators.ts do the actual narrowing.
export type CreateTopicBody = {
  title?: unknown;
  taskUrl?: unknown;
  projectSlug?: unknown;
  projectLabel?: unknown;
  body?: unknown;
};
export type CreateReplyBody = { body?: unknown };
export type CreateFeedbackThreadBody = {
  recipientUserId?: unknown;
  recipientName?: unknown;
  subject?: unknown;
  body?: unknown;
};
export type CreateFeedbackReplyBody = { body?: unknown };
export type SetPageActiveBody = { isActive?: unknown };
export type SetPageContentBody = { lang?: unknown; contentMd?: unknown };
export type SetContactEmailBody = { email?: unknown };
export type SetShowContactFormBody = { showForm?: unknown };
export type ContactSubmissionBody = { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
export type SetPagesOrderBody = { order?: unknown };
export type AnnouncementBody = {
  title?: unknown;
  description?: unknown;
  targetType?: unknown;
  targetProjectSlug?: unknown;
  isActive?: unknown;
  startDate?: unknown;
  endDate?: unknown;
};
export type SetInstitutionsOrderBody = { order?: unknown };
export type SetManualTitleBody = { lang?: unknown; title?: unknown };
export type SetManualContentBody = { content?: unknown };
export type SetManualLinkBody = { manualId?: unknown };
export type SetInstitutionLinkBody = { institutionId?: unknown };
export type PruneProjectLinksBody = { liveSlugs?: unknown };
