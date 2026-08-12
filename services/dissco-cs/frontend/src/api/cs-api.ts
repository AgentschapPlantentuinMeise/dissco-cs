import { getJwt, redirectToExpiredLogin } from './jwt';
import { getSiteSlug } from './slug';
import { CrowdsourcingTask } from '../types/crowdsourcing-task';

async function csFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = getJwt();

  const response = await fetch(`/api/dissco-cs${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (response.status === 401) {
    return redirectToExpiredLogin<T>();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`DiSSCo CS API request failed: ${response.status}${body ? ` - ${body}` : ''}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export type ForumTopic = {
  id: string;
  site_id: number;
  author_user_id: number;
  author_name: string;
  title: string;
  task_url: string | null;
  body: string;
  created_at: string;
  last_activity: string;
};

export type ForumTopicWithReplyCount = ForumTopic & { reply_count: number; last_seen_reply_count: number | null };

export type ForumReply = {
  id: string;
  topic_id: string;
  site_id: number;
  author_user_id: number;
  author_name: string;
  body: string;
  created_at: string;
};

export type ForumTopicWithReplies = ForumTopic & { replies: ForumReply[] };

export const forumApi = {
  listTopics: () => csFetch<{ topics: ForumTopicWithReplyCount[] }>('/forum/topics'),

  createTopic: (data: { title: string; taskUrl: string; body: string }) =>
    csFetch<ForumTopic>('/forum/topics', { method: 'POST', body: JSON.stringify(data) }),

  getTopic: (topicId: string) => csFetch<ForumTopicWithReplies>(`/forum/topics/${topicId}`),

  createReply: (topicId: string, body: string) =>
    csFetch<ForumReply>(`/forum/topics/${topicId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  visitForum: () => csFetch<void>('/forum/topics/visit', { method: 'POST' }),

  deleteTopic: (topicId: string) => csFetch<void>(`/forum/topics/${topicId}`, { method: 'DELETE' }),
};

// Order here is the default display order (navbar + page management) for sites that
// haven't customized it yet — must match SITE_PAGE_KEYS in services/dissco-cs/api/src/db.ts.
export const SITE_PAGE_KEYS = ['institutions', 'forum', 'about', 'help', 'contact', 'welcome'] as const;
export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];
export type SitePageLang = 'nl' | 'en' | 'fr' | 'de';

export type SitePage = {
  site_id: number;
  page_key: SitePageKey;
  is_active: boolean;
  content: Partial<Record<SitePageLang, string>>;
  contact_email: string | null;
  show_contact_form: boolean;
  sort_order: number;
  updated_at: string;
};

export const sitePagesApi = {
  list: () => csFetch<{ pages: SitePage[] }>(`/site-pages?slug=${getSiteSlug()}`),

  setActive: (key: SitePageKey, isActive: boolean) =>
    csFetch<void>(`/site-pages/${key}`, { method: 'PUT', body: JSON.stringify({ isActive }) }),

  setContent: (key: SitePageKey, lang: SitePageLang, contentMd: string) =>
    csFetch<void>(`/site-pages/${key}/content`, { method: 'PUT', body: JSON.stringify({ lang, contentMd }) }),

  setContactEmail: (email: string) =>
    csFetch<void>('/site-pages/contact/email', { method: 'PUT', body: JSON.stringify({ email }) }),

  setShowContactForm: (showForm: boolean) =>
    csFetch<void>('/site-pages/contact/show-form', { method: 'PUT', body: JSON.stringify({ showForm }) }),

  setOrder: (order: SitePageKey[]) =>
    csFetch<void>('/site-pages/order', { method: 'PUT', body: JSON.stringify({ order }) }),
};

export type ProjectProgress = {
  transcribedPercentage: number;
  totalTasks: number;
};

export const projectProgressApi = {
  get: (projectId: string | number) =>
    csFetch<ProjectProgress>(`/projects/${projectId}/progress?slug=${getSiteSlug()}`),
};

export const manifestClaimApi = {
  // Herberekent de gedeelde max-contributors-teller na een abandon (zie AnnotatePage.tsx) —
  // best-effort, madoc-ts synct die teller zelf enkel bij het aanmaken van een nieuwe claim.
  resync: (projectId: string | number, manifestId: string | number) =>
    csFetch<{ resynced: boolean }>(`/projects/${projectId}/manifests/${manifestId}/resync-claim?slug=${getSiteSlug()}`, {
      method: 'POST',
    }),
};

// A manifest-task stuck on "max contributors" whose underlying claims are all already -1 —
// nothing to release, just a stale counter that needs resyncing (see StuckTasks.tsx).
export type StuckManifestCounter = {
  id: string;
  name?: string;
  subject: string;
  modified_at: number;
  maxContributors: number;
  validCount: number;
  metadata?: {
    project?: { id: number; slug: string; label?: Record<string, string[]> | string };
  };
};

export type ProjectDebugTaskEntry = {
  id: string;
  status: number;
  status_text?: string;
  assignee?: string;
  modified_at: number;
};

export type ProjectDebugManifest = {
  manifestId: number;
  label?: Record<string, string[]> | string;
  countsAsTranscribed: boolean;
  tasks: ProjectDebugTaskEntry[];
};

export type ProjectDebugResult = {
  totalManifests: number;
  transcribedPercentage: number;
  manifests: ProjectDebugManifest[];
};

export const projectDebugApi = {
  getTaskStatus: (projectId: string | number) => csFetch<ProjectDebugResult>(`/projects/${projectId}/task-debug`),
};

export const stuckTasksApi = {
  list: () => csFetch<{ tasks: CrowdsourcingTask[]; manifestCounters: StuckManifestCounter[] }>('/projects/stuck-tasks'),

  release: (taskId: string) => csFetch<{ released: boolean }>(`/projects/stuck-tasks/${taskId}/release`, { method: 'POST' }),

  resyncManifest: (containerId: string) =>
    csFetch<{ resynced: boolean }>(`/projects/stuck-tasks/manifests/${containerId}/resync`, { method: 'POST' }),
};

export type ReviewTaskRow = {
  id: string;
  project: { id?: number; slug?: string; label?: Record<string, string[]> | string };
  subject: { id?: number; label?: Record<string, string[]> | string };
  subject_raw?: string;
  subject_parent_raw?: string;
  status: number;
  status_text?: string;
  submitter?: string;
  reviewer?: string;
  reviewerId?: number;
  originalTaskId?: string;
  revisionId?: string;
  modified_at: number;
};

export const reviewApi = {
  myTasks: () => csFetch<{ tasks: ReviewTaskRow[] }>('/review/my-tasks'),

  isReviewer: () => csFetch<{ isReviewer: boolean }>('/review/is-reviewer'),
};

export const contactApi = {
  send: (data: { name: string; email: string; message: string; website: string }) =>
    csFetch<void>(`/contact?slug=${getSiteSlug()}`, { method: 'POST', body: JSON.stringify(data) }),
};

export const ANNOUNCEMENT_TARGET_TYPES = ['homepage', 'projects', 'project'] as const;
export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number];

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

export const announcementsApi = {
  listAdmin: () => csFetch<{ announcements: Announcement[] }>('/announcements'),

  listActive: (target: AnnouncementTargetType, projectSlug?: string) =>
    csFetch<{ announcements: Announcement[] }>(
      `/announcements/active?slug=${getSiteSlug()}&target=${target}${
        projectSlug ? `&projectSlug=${encodeURIComponent(projectSlug)}` : ''
      }`
    ),

  create: (data: AnnouncementInput) =>
    csFetch<Announcement>('/announcements', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: Announcement['id'], data: AnnouncementInput) =>
    csFetch<Announcement>(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: Announcement['id']) => csFetch<void>(`/announcements/${id}`, { method: 'DELETE' }),
};

export type Institution = {
  id: number;
  site_id: number;
  slug: string;
  name: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type InstitutionInput = {
  name: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo: string | null;
  isActive: boolean;
};

export const institutionsApi = {
  listActive: () => csFetch<{ institutions: Institution[] }>(`/institutions/active?slug=${getSiteSlug()}`),

  getActive: (slug: string) => csFetch<Institution>(`/institutions/active/${slug}?slug=${getSiteSlug()}`),

  getForProject: (projectSlug: string) =>
    csFetch<Institution>(`/institutions/for-project/${encodeURIComponent(projectSlug)}?slug=${getSiteSlug()}`),

  getActiveProjectSlugs: (slug: string) =>
    csFetch<{ projectSlugs: string[] }>(`/institutions/active/${slug}/projects?slug=${getSiteSlug()}`),

  listAdmin: () => csFetch<{ institutions: Institution[] }>('/institutions'),

  create: (data: InstitutionInput) =>
    csFetch<Institution>('/institutions', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: Institution['id'], data: InstitutionInput) =>
    csFetch<Institution>(`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: Institution['id']) => csFetch<void>(`/institutions/${id}`, { method: 'DELETE' }),

  setOrder: (order: Institution['id'][]) =>
    csFetch<void>('/institutions/order', { method: 'PUT', body: JSON.stringify({ order }) }),

  listProjectLinks: () => csFetch<{ links: Record<string, number> }>('/institutions/project-links'),

  setProjectLink: (projectSlug: string, institutionId: number | null) =>
    csFetch<void>(`/institutions/project-links/${encodeURIComponent(projectSlug)}`, {
      method: 'PUT',
      body: JSON.stringify({ institutionId }),
    }),
};

export type ProjectManualAttachmentMeta = { filename: string; mimeType: string; size: number };

export type ProjectManual = {
  id: number;
  site_id: number;
  title: Partial<Record<SitePageLang, string>>;
  content: Partial<Record<SitePageLang, string>>;
  updated_at: string;
};

export type ProjectManualSummary = ProjectManual & { linkedProjectSlugs: string[]; attachmentLangs: SitePageLang[] };

export type ProjectManualForVolunteer = {
  id: number;
  title: Partial<Record<SitePageLang, string>>;
  content: Partial<Record<SitePageLang, string>>;
  attachments: Partial<Record<SitePageLang, ProjectManualAttachmentMeta>>;
};

export type ProjectManualDetail = ProjectManual & {
  attachments: Partial<Record<SitePageLang, ProjectManualAttachmentMeta>>;
};

export const projectManualsApi = {
  getForProject: (projectSlug: string) =>
    csFetch<ProjectManualForVolunteer>(`/projects/${encodeURIComponent(projectSlug)}/manual?slug=${getSiteSlug()}`),

  getAdmin: (manualId: number) => csFetch<ProjectManualDetail>(`/manuals/${manualId}`),

  attachmentUrl: (projectSlug: string, lang: SitePageLang) =>
    `/api/dissco-cs/projects/${encodeURIComponent(projectSlug)}/manual/attachment/${lang}?slug=${getSiteSlug()}`,

  setLink: (projectSlug: string, manualId: number | null) =>
    csFetch<void>(`/projects/${encodeURIComponent(projectSlug)}/manual-link`, {
      method: 'PUT',
      body: JSON.stringify({ manualId }),
    }),

  list: () => csFetch<{ manuals: ProjectManualSummary[] }>('/manuals'),

  create: (lang: SitePageLang, title: string) =>
    csFetch<ProjectManual>('/manuals', { method: 'POST', body: JSON.stringify({ lang, title }) }),

  remove: (manualId: number) => csFetch<void>(`/manuals/${manualId}`, { method: 'DELETE' }),

  setTitle: (manualId: number, lang: SitePageLang, title: string) =>
    csFetch<ProjectManual>(`/manuals/${manualId}/title`, { method: 'PUT', body: JSON.stringify({ lang, title }) }),

  setContent: (manualId: number, lang: SitePageLang, content: string) =>
    csFetch<void>(`/manuals/${manualId}/${lang}`, { method: 'PUT', body: JSON.stringify({ content }) }),

  uploadAttachment: async (manualId: number, lang: SitePageLang, file: File): Promise<void> => {
    const jwt = getJwt();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/dissco-cs/manuals/${manualId}/${lang}/attachment`, {
      method: 'PUT',
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      body: formData,
    });

    if (response.status === 401) {
      return redirectToExpiredLogin<void>();
    }

    if (!response.ok) {
      throw new Error(`DiSSCo CS API request failed: ${response.status}`);
    }
  },

  deleteAttachment: (manualId: number, lang: SitePageLang) =>
    csFetch<void>(`/manuals/${manualId}/${lang}/attachment`, { method: 'DELETE' }),
};
