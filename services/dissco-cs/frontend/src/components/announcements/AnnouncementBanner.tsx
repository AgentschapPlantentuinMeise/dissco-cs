import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Announcement, announcementsApi, AnnouncementTargetType } from '../../api/cs-api';
import { LuPin, LuChevronDown } from 'react-icons/lu';
import { useUser } from '../../hooks/use-current-user';

// Compact overrides so markdown content fits the banner's small text-sm style instead of
// CsMarkdown's full-page heading/paragraph sizes.
const descriptionMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 mt-1 mb-0 last:mb-0">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-[var(--cs-primary)] underline">
      {children}
    </a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="text-sm text-gray-700 mt-1 mb-0 list-disc pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="text-sm text-gray-700 mt-1 mb-0 list-decimal pl-5">{children}</ol>
  ),
};

function storageKey(target: AnnouncementTargetType, projectSlug?: string): string {
  return `cs-announcements-collapsed-${target}${projectSlug ? `-${projectSlug}` : ''}`;
}

function signatureOf(announcement: Announcement): string {
  return `${announcement.id}:${JSON.stringify(announcement.title)}:${JSON.stringify(announcement.description)}`;
}

function readSeenSignatures(key: string): string[] | null {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const AnnouncementBanner: React.FC<{ target: AnnouncementTargetType; projectSlug?: string }> = ({
  target,
  projectSlug,
}) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useUser();
  const { data } = useQuery(
    ['active-announcements', target, projectSlug],
    () => announcementsApi.listActive(target, projectSlug),
    { staleTime: 0, enabled: !!user }
  );
  const text = (field: Announcement['title']) =>
    field[i18n.language as keyof Announcement['title']] || field.nl || '';

  const announcements = data?.announcements ?? [];
  const signatures = announcements.map(signatureOf);
  const key = storageKey(target, projectSlug);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (announcements.length === 0) {
      setCollapsed(false);
      return;
    }
    const seen = readSeenSignatures(key);
    setCollapsed(seen !== null && signatures.every((sig: string) => seen.includes(sig)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, signatures.join('|')]);

  if (!user || announcements.length === 0) {
    return null;
  }

  const toggle = () => {
    if (collapsed) {
      window.localStorage.removeItem(key);
      setCollapsed(false);
    } else {
      window.localStorage.setItem(key, JSON.stringify(signatures));
      setCollapsed(true);
    }
  };

  return (
    <div
      role="status"
      className="mt-6 mb-6 overflow-hidden rounded-lg border-l-4 border-amber-300 bg-amber-50 shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
    >
      <button
        onClick={toggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-3 bg-transparent border-none cursor-pointer px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-amber-800">
          <LuPin aria-hidden="true" />
          {collapsed
            ? t('announcement_summary_collapsed', { count: announcements.length })
            : t('announcement_header_title')}
        </span>
        <LuChevronDown
          aria-hidden="true"
          className={`text-amber-800 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {announcements.map((announcement, index) => (
            <div key={announcement.id} className={index > 0 ? 'border-t border-black/10 pt-3' : undefined}>
              <p className="font-semibold text-amber-800 m-0">{text(announcement.title)}</p>
              <ReactMarkdown components={descriptionMarkdownComponents}>{text(announcement.description)}</ReactMarkdown>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
