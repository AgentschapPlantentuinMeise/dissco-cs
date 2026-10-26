import { AnnouncementDto, AnnouncementTargetType } from '@dissco-cs/shared-types';

export interface RouteAnnouncementTargets {
  // The place whose new announcements appear as a strip on this page; null on pages without
  // announcements of their own (forum, institutions, ...) and on the annotate page, which fills
  // the screen exactly below the navbar.
  page: { target: AnnouncementTargetType; projectSlug?: string } | null;
  // The project the page belongs to, also on the annotate page: its announcements are listed first
  // under the megaphone.
  projectSlug?: string;
}

/**
 * Which announcement targets belong to a route of the SPA (the path below /s/<site>).
 * @param pathname the router's pathname, e.g. '/explore/herbarium/manifests/12/annotate'
 * Returns: the page's own target (or null) and the project slug in the URL, if any.
 */
export function announcementTargetsFor(pathname: string): RouteAnnouncementTargets {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') {
    return { page: { target: 'homepage' } };
  }
  if (path === '/explore') {
    return { page: { target: 'projects' } };
  }
  const project = path.match(/^\/explore\/([^/]+)(\/.*)?$/);
  if (project) {
    const projectSlug = decodeURIComponent(project[1]);
    return { page: project[2] ? null : { target: 'project', projectSlug }, projectSlug };
  }
  return { page: null };
}

// Changes when an announcement is edited, so an edited announcement counts as new again.
export function announcementSignature(announcement: AnnouncementDto): string {
  return `${announcement.id}:${JSON.stringify(announcement.title)}:${JSON.stringify(announcement.description)}`;
}

/** The announcements whose current version is not in the seen list. */
export function unseenAnnouncements(announcements: AnnouncementDto[], seen: readonly string[]): AnnouncementDto[] {
  return announcements.filter(announcement => !seen.includes(announcementSignature(announcement)));
}

/** Joins announcement lists, keeping the first occurrence of each id (the order gives priority). */
export function mergeAnnouncements(...lists: AnnouncementDto[][]): AnnouncementDto[] {
  const byId = new Map<AnnouncementDto['id'], AnnouncementDto>();
  for (const list of lists) {
    for (const announcement of list) {
      if (!byId.has(announcement.id)) {
        byId.set(announcement.id, announcement);
      }
    }
  }
  return [...byId.values()];
}
