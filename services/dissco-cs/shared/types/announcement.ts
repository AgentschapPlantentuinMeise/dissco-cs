import { SitePageLang } from './site-page.js';

export const ANNOUNCEMENT_TARGET_TYPES = ['homepage', 'projects', 'project'] as const;
export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number];

// Wire shape (dates as ISO strings). The API repository keeps its own local `Announcement` row
// type with `start_date`/`end_date`/`created_at: Date | null` for internal use.
export type Announcement = {
  id: string;
  site_id: number;
  title: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  target_type: AnnouncementTargetType;
  target_project_slug: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type AnnouncementInput = {
  title: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  targetType: AnnouncementTargetType;
  targetProjectSlug: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
};
