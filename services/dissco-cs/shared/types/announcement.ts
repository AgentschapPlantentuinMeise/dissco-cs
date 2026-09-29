import { z } from 'zod';
import { SitePageLang, multilingualTextSchema } from './common.js';

export const ANNOUNCEMENT_TARGET_TYPES = ['homepage', 'projects', 'project'] as const;
export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number];

// Wire shape (dates as ISO strings). created_at is DB bookkeeping only (see AnnouncementRow in
// the API repository) and never sent to the frontend; routes strip it via toAnnouncementDto().
export type AnnouncementDto = {
  id: string;
  site_id: number;
  title: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  target_type: AnnouncementTargetType;
  target_project_slug: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

const isoDateOrNull = z
  .string()
  .nullable()
  .refine(v => v === null || !Number.isNaN(Date.parse(v)), 'Invalid date');

function endOfDayIfDateOnly(value: string | null): string | null {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return `${value}T23:59:59.999`;
}

export const announcementInputSchema = z
  .object({
    title: multilingualTextSchema(true),
    description: multilingualTextSchema(true),
    targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES),
    targetProjectSlug: z.string().trim().min(1).nullable(),
    isActive: z.boolean(),
    startDate: isoDateOrNull,
    endDate: isoDateOrNull,
  })
  .transform(data => ({ ...data, endDate: endOfDayIfDateOnly(data.endDate) }))
  .refine(data => data.targetType !== 'project' || !!data.targetProjectSlug, {
    message: 'targetProjectSlug is required when targetType is project',
    path: ['targetProjectSlug'],
  })
  .refine(data => !data.startDate || !data.endDate || Date.parse(data.startDate) <= Date.parse(data.endDate), {
    message: 'startDate must be before endDate',
    path: ['endDate'],
  });

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
