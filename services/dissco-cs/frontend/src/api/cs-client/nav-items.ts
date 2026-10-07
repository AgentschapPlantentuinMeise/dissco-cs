import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { NavItemKey, SitePageLang, NavItemDto } from '@dissco-cs/shared-types';

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
