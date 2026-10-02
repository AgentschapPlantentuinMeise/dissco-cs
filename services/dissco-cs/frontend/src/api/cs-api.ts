import { getJwt, redirectToExpiredLogin } from './jwt';
import { getSiteSlug } from './slug';
import {
  MadocCrowdsourcingTaskDto,
  ForumTopicDto,
  ForumReplyDto,
  ForumTopicInput,
  NavItemKey,
  SitePageLang,
  NavItemDto,
  FeedbackThreadDto,
  FeedbackMessageDto,
  FeedbackThreadInput,
  AnnouncementTargetType,
  AnnouncementDto,
  AnnouncementInput,
  SiteStatsDto,
  HonourBoardPeriodDto,
  HonourBoardPeriodKey,
  InstitutionDto,
  InstitutionInput,
  InstitutionStatsDto,
  ManualDto,
  ManualSummaryDto,
  ManualDetailDto,
  ProjectProgressDto,
  ProjectDebugDto,
  ReviewTaskDto,
  ContactSubmissionInput,
} from '@dissco-cs/shared-types';

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

export const forumApi = {
  listTopics: () => csFetch<{ topics: ForumTopicDto[] }>('/forum/topics'),

  createTopic: (data: ForumTopicInput) =>
    csFetch<ForumTopicDto>('/forum/topics', { method: 'POST', body: JSON.stringify(data) }),

  listReplies: (topicId: number) => csFetch<ForumReplyDto[]>(`/forum/topics/${topicId}/replies`),

  createReply: (topicId: number, body: string) =>
    csFetch<ForumReplyDto>(`/forum/topics/${topicId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  visitForum: () => csFetch<void>('/forum/topics/visit', { method: 'POST' }),

  deleteTopic: (topicId: number) => csFetch<void>(`/forum/topics/${topicId}`, { method: 'DELETE' }),

  closeTopic: (topicId: number) => csFetch<ForumTopicDto>(`/forum/topics/${topicId}/close`, { method: 'POST' }),

  deleteReply: (topicId: number, replyId: number) =>
    csFetch<void>(`/forum/topics/${topicId}/replies/${replyId}`, { method: 'DELETE' }),
};

export const navItemsApi = {
  list: () => csFetch<{ navItems: NavItemDto[] }>(`/nav-items?slug=${getSiteSlug()}`),

  setActive: (key: NavItemKey, isActive: boolean) =>
    csFetch<void>(`/nav-items/${key}`, { method: 'PUT', body: JSON.stringify({ isActive }) }),

  setContent: (key: NavItemKey, lang: SitePageLang, contentMd: string) =>
    csFetch<void>(`/nav-items/${key}/content`, { method: 'PUT', body: JSON.stringify({ lang, contentMd }) }),

  setContactEmail: (email: string) =>
    csFetch<void>('/nav-items/contact/email', { method: 'PUT', body: JSON.stringify({ email }) }),

  setShowContactForm: (showForm: boolean) =>
    csFetch<void>('/nav-items/contact/show-form', { method: 'PUT', body: JSON.stringify({ showForm }) }),

  setOrder: (order: NavItemKey[]) =>
    csFetch<void>('/nav-items/order', { method: 'PUT', body: JSON.stringify({ order }) }),
};

export const projectProgressApi = {
  get: (projectId: string | number, signal?: AbortSignal) =>
    csFetch<ProjectProgressDto>(`/projects/${projectId}/progress?slug=${getSiteSlug()}`, { signal }),
};

export const manifestClaimApi = {
  // Herberekent de gedeelde max-contributors-teller na een abandon (zie AnnotatePage.tsx) —
  // best-effort, madoc-ts synct die teller zelf enkel bij het aanmaken van een nieuwe claim.
  resync: (projectId: string | number, manifestId: string | number) =>
    csFetch<{ resynced: boolean }>(`/projects/${projectId}/manifests/${manifestId}/resync-claim?slug=${getSiteSlug()}`, {
      method: 'POST',
    }),
};

export const projectDebugApi = {
  getTaskStatus: (projectId: string | number) => csFetch<ProjectDebugDto>(`/projects/${projectId}/task-debug`),
};

export const stuckTasksApi = {
  list: () => csFetch<{ tasks: MadocCrowdsourcingTaskDto[]; manifestCounters: MadocCrowdsourcingTaskDto[] }>('/projects/stuck-tasks'),

  release: (taskId: string) => csFetch<{ released: boolean }>(`/projects/stuck-tasks/${taskId}/release`, { method: 'POST' }),

  resyncManifest: (containerId: string) =>
    csFetch<{ resynced: boolean }>(`/projects/stuck-tasks/manifests/${containerId}/resync`, { method: 'POST' }),
};

export const reviewApi = {
  getReviewTasks: () => csFetch<{ tasks: ReviewTaskDto[] }>('/review/tasks'),

  isReviewer: () => csFetch<{ isReviewer: boolean }>('/review/is-reviewer'),
};

export const feedbackApi = {
  listThreads: () => csFetch<{ threads: FeedbackThreadDto[] }>('/feedback/threads'),

  createThread: (data: FeedbackThreadInput) =>
    csFetch<FeedbackThreadDto>('/feedback/threads', { method: 'POST', body: JSON.stringify(data) }),

  getThread: (threadId: number) =>
    csFetch<{ thread: FeedbackThreadDto; messages: FeedbackMessageDto[] }>(`/feedback/threads/${threadId}`),

  createReply: (threadId: number, body: string) =>
    csFetch<FeedbackMessageDto>(`/feedback/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  deleteThread: (threadId: number) =>
    csFetch<void>(`/feedback/threads/${threadId}`, { method: 'DELETE' }),
};

export const contactApi = {
  send: (data: ContactSubmissionInput) =>
    csFetch<void>(`/contact?slug=${getSiteSlug()}`, { method: 'POST', body: JSON.stringify(data) }),
};

export const announcementsApi = {
  listAdmin: () => csFetch<{ announcements: AnnouncementDto[] }>('/announcements'),

  listActive: (target: AnnouncementTargetType, projectSlug?: string) =>
    csFetch<{ announcements: AnnouncementDto[] }>(
      `/announcements/active?slug=${getSiteSlug()}&target=${target}${
        projectSlug ? `&projectSlug=${encodeURIComponent(projectSlug)}` : ''
      }`
    ),

  create: (data: AnnouncementInput) =>
    csFetch<AnnouncementDto>('/announcements', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: AnnouncementDto['id'], data: AnnouncementInput) =>
    csFetch<AnnouncementDto>(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: AnnouncementDto['id']) => csFetch<void>(`/announcements/${id}`, { method: 'DELETE' }),
};

export const statsApi = {
  get: () => csFetch<SiteStatsDto>(`/stats?slug=${getSiteSlug()}`),
  // Pure cache read, never triggers a recompute -- for periodic polling.
  getCurrent: () => csFetch<SiteStatsDto>(`/stats/current?slug=${getSiteSlug()}`),
};

export const honourBoardApi = {
  get: (period: HonourBoardPeriodKey) => csFetch<HonourBoardPeriodDto>(`/honour-board/${period}?slug=${getSiteSlug()}`),
  // Pure cache read, never triggers a recompute -- for periodic polling.
  getCurrent: (period: HonourBoardPeriodKey) =>
    csFetch<HonourBoardPeriodDto>(`/honour-board/${period}/current?slug=${getSiteSlug()}`),
};

export const institutionsApi = {
  listActive: () => csFetch<{ institutions: InstitutionDto[] }>(`/institutions/active?slug=${getSiteSlug()}`),

  getActive: (slug: string) => csFetch<InstitutionDto>(`/institutions/active/${slug}?slug=${getSiteSlug()}`),

  getForProject: (projectSlug: string) =>
    csFetch<InstitutionDto>(`/institutions/for-project/${encodeURIComponent(projectSlug)}?slug=${getSiteSlug()}`),

  getActiveProjectSlugs: (slug: string) =>
    csFetch<{ projectSlugs: string[] }>(`/institutions/active/${slug}/projects?slug=${getSiteSlug()}`),

  getStats: (slug: string) =>
    csFetch<InstitutionStatsDto>(`/institutions/active/${slug}/stats?slug=${getSiteSlug()}`),
  // Pure cache read, never triggers a recompute -- for periodic polling.
  getStatsCurrent: (slug: string) =>
    csFetch<InstitutionStatsDto>(`/institutions/active/${slug}/stats/current?slug=${getSiteSlug()}`),

  getHonourBoard: (slug: string, period: HonourBoardPeriodKey) =>
    csFetch<HonourBoardPeriodDto>(`/institutions/active/${slug}/honour-board/${period}?slug=${getSiteSlug()}`),
  // Pure cache read, never triggers a recompute -- for periodic polling.
  getHonourBoardCurrent: (slug: string, period: HonourBoardPeriodKey) =>
    csFetch<HonourBoardPeriodDto>(`/institutions/active/${slug}/honour-board/${period}/current?slug=${getSiteSlug()}`),

  listAdmin: () => csFetch<{ institutions: InstitutionDto[] }>('/institutions'),

  create: (data: InstitutionInput) =>
    csFetch<InstitutionDto>('/institutions', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: InstitutionDto['id'], data: InstitutionInput) =>
    csFetch<InstitutionDto>(`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: InstitutionDto['id']) => csFetch<void>(`/institutions/${id}`, { method: 'DELETE' }),

  setOrder: (order: InstitutionDto['id'][]) =>
    csFetch<void>('/institutions/order', { method: 'PUT', body: JSON.stringify({ order }) }),

  listProjectLinks: () => csFetch<{ links: Record<string, number> }>('/institutions/project-links'),

  setProjectLink: (projectSlug: string, institutionId: number | null) =>
    csFetch<void>(`/institutions/project-links/${encodeURIComponent(projectSlug)}`, {
      method: 'PUT',
      body: JSON.stringify({ institutionId }),
    }),

  pruneProjectLinks: (liveSlugs: string[]) =>
    csFetch<{ removed: number }>('/institutions/project-links/prune', {
      method: 'PUT',
      body: JSON.stringify({ liveSlugs }),
    }),
};

export const manualsApi = {
  getForProject: (projectSlug: string) =>
    csFetch<ManualDetailDto>(`/projects/${encodeURIComponent(projectSlug)}/manual?slug=${getSiteSlug()}`),

  getAdmin: (manualId: number) => csFetch<ManualDetailDto>(`/manuals/${manualId}`),

  attachmentUrl: (projectSlug: string, lang: SitePageLang) =>
    `/api/dissco-cs/projects/${encodeURIComponent(projectSlug)}/manual/attachment/${lang}?slug=${getSiteSlug()}`,

  setLink: (projectSlug: string, manualId: number | null) =>
    csFetch<void>(`/projects/${encodeURIComponent(projectSlug)}/manual-link`, {
      method: 'PUT',
      body: JSON.stringify({ manualId }),
    }),

  list: () => csFetch<{ manuals: ManualSummaryDto[] }>('/manuals'),

  create: (lang: SitePageLang, title: string) =>
    csFetch<ManualDto>('/manuals', { method: 'POST', body: JSON.stringify({ lang, title }) }),

  remove: (manualId: number) => csFetch<void>(`/manuals/${manualId}`, { method: 'DELETE' }),

  setTitle: (manualId: number, lang: SitePageLang, title: string) =>
    csFetch<ManualDto>(`/manuals/${manualId}/title`, { method: 'PUT', body: JSON.stringify({ lang, title }) }),

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

  pruneProjectLinks: (liveSlugs: string[]) =>
    csFetch<{ removed: number }>('/projects/manual-links/prune', {
      method: 'PUT',
      body: JSON.stringify({ liveSlugs }),
    }),
};
