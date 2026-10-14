import { ApiError, csFetch } from './request';
import { getJwt, redirectToExpiredLogin } from '../jwt';
import { SitePageLang, ManualDto, ManualSummaryDto, ManualDetailDto } from '@dissco-cs/shared-types';

export const manualsApi = {
  getAdmin: (manualId: number) => csFetch<ManualDetailDto>(`/manuals/${manualId}`),

  list: () => csFetch<{ manuals: ManualSummaryDto[] }>('/manuals'),

  create: (lang: SitePageLang, title: string) =>
    csFetch<ManualDto>('/manuals', { method: 'POST', body: JSON.stringify({ lang, title }) }),

  remove: (manualId: number) => csFetch<void>(`/manuals/${manualId}`, { method: 'DELETE' }),

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
      const path = `/manuals/${manualId}/${lang}/attachment`;
      throw new ApiError(response.status, path, (await response.text().catch(() => '')) || undefined);
    }
  },

  deleteAttachment: (manualId: number, lang: SitePageLang) =>
    csFetch<void>(`/manuals/${manualId}/${lang}/attachment`, { method: 'DELETE' }),
};
