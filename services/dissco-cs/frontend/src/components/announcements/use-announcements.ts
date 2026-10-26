import { useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnnouncementDto } from '@dissco-cs/shared-types';
import { announcementQueries } from '../../api/queries/announcements';
import { useCurrentUser } from '../../hooks/use-current-user';
import { announcementSignature, announcementTargetsFor, mergeAnnouncements, unseenAnnouncements } from './announcement-rules';

// The announcements that were clicked away, remembered in this browser as signatures (id plus
// content), so a new or edited announcement shows again. One store for the megaphone and the strip:
// clicking the strip away also quiets the megaphone.
const SEEN_KEY = 'cs-announcements-seen';
const MAX_SEEN = 200;
const listeners = new Set<() => void>();
let seenCache: string[] | null = null;

function readSeen(): string[] {
  if (seenCache === null) {
    try {
      const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
      seenCache = Array.isArray(parsed) ? parsed : [];
    } catch {
      seenCache = [];
    }
  }
  return seenCache;
}

function markSeen(announcements: AnnouncementDto[]): void {
  const added = announcements.map(announcementSignature).filter(sig => !readSeen().includes(sig));
  if (added.length === 0) {
    return;
  }
  seenCache = [...readSeen(), ...added].slice(-MAX_SEEN);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seenCache));
  } catch {
    // Storage blocked: the announcements stay clicked away until the page reloads.
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The announcements for the current route, for logged-in users only (as before):
// - all: under the megaphone -- the current project's first, then those for home and the project list
// - pageNew: the not yet seen ones of this page's own place, shown as the strip
export function useAnnouncements() {
  const user = useCurrentUser();
  const { pathname } = useLocation();
  const { page, projectSlug } = announcementTargetsFor(pathname);
  const seen = useSyncExternalStore(subscribe, readSeen);

  const enabled = !!user;
  const { data: homepage = [] } = useQuery({ ...announcementQueries.active('homepage'), enabled });
  const { data: projects = [] } = useQuery({ ...announcementQueries.active('projects'), enabled });
  const { data: project = [] } = useQuery({ ...announcementQueries.active('project', projectSlug), enabled: enabled && !!projectSlug });

  const all = mergeAnnouncements(project, homepage, projects);
  const pageOwn = page === null ? [] : page.target === 'homepage' ? homepage : page.target === 'projects' ? projects : project;

  return {
    all,
    unseenCount: unseenAnnouncements(all, seen).length,
    pageNew: unseenAnnouncements(pageOwn, seen),
    markSeen,
  };
}
