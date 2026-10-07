import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { InstitutionDto, InstitutionInput } from '@dissco-cs/shared-types';

export const institutionsApi = {
  listActive: () => csFetch<{ institutions: InstitutionDto[] }>(`/institutions/active?slug=${getSiteSlug()}`),

  getActive: (slug: string) => csFetch<InstitutionDto>(`/institutions/active/${slug}?slug=${getSiteSlug()}`),

  getActiveProjectSlugs: (slug: string) =>
    csFetch<{ projectSlugs: string[] }>(`/institutions/active/${slug}/projects?slug=${getSiteSlug()}`),

  listAdmin: () => csFetch<{ institutions: InstitutionDto[] }>('/institutions'),

  create: (data: InstitutionInput) =>
    csFetch<InstitutionDto>('/institutions', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: InstitutionDto['id'], data: InstitutionInput) =>
    csFetch<InstitutionDto>(`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: InstitutionDto['id']) => csFetch<void>(`/institutions/${id}`, { method: 'DELETE' }),

  setOrder: (order: InstitutionDto['id'][]) =>
    csFetch<void>('/institutions/order', { method: 'PUT', body: JSON.stringify({ order }) }),
};
