import { z } from 'zod';
import { MultilingualText, multilingualTextSchema } from './common.js';

export const ANNOUNCEMENT_TARGET_TYPES = ['homepage', 'projects', 'project'] as const;
export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number];

/**
 * Whether a value is one of the announcement targets (ANNOUNCEMENT_TARGET_TYPES).
 * E.g. a URL or query parameter that still has to be checked.
 * @param value anything
 * Returns: true, and narrows the type, when it is.
 */
export function isAnnouncementTargetType(value: unknown): value is AnnouncementTargetType {
  return typeof value === 'string' && (ANNOUNCEMENT_TARGET_TYPES as readonly string[]).includes(value);
}

export type AnnouncementDto = {
  id: string;
  title: MultilingualText;
  description: MultilingualText;
  targetType: AnnouncementTargetType;
  targetProjectSlug: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
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
