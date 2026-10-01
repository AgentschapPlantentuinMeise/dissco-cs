// Unvalidated JSON request-body shapes for dissco-cs's own routes -- every field is `unknown`
// on purpose, the corresponding parse*/is* functions in validators.ts do the actual narrowing.
export type ContactSubmissionBody = { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
export type SetInstitutionsOrderBody = { order?: unknown };
export type SetManualLinkBody = { manualId?: unknown };
export type SetInstitutionLinkBody = { institutionId?: unknown };
export type PruneProjectLinksBody = { liveSlugs?: unknown };
