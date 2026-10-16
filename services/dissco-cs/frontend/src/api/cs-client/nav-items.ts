import { csFetch, csFetchField } from './request';
import { urlPath, withSite } from '../url';
import { NavItemKey, SitePageLang, NavItemDto, NavItemContactEmailDto } from '@dissco-cs/shared-types';

export const navItemsApi = {
  /**
   * Every optional page of the site (institutions, forum, about, help, contact, welcome) with its
   * on/off state, order and content. A page never configured comes back as active with its
   * default order.
   * Input: none.
   * Who: anyone.
   * Returns: NavItemDto[].
   */
  list: () => csFetchField<NavItemDto[]>(withSite('/nav-items'), 'navItems'),

  /**
   * The stored address the contact form mails to, also while the contact page is off.
   * Input: none.
   * Who: site admin.
   * Returns: { email: string | null }.
   */
  getContactEmail: () => csFetch<NavItemContactEmailDto>('/nav-items/contact/email'),

  /**
   * Turns an optional page on or off (off = gone from the navbar and its route).
   * @param key the page (NAV_ITEM_KEYS)
   * @param isActive true to show it
   * Who: site admin.
   * Returns: nothing (204); 404 unknown key.
   */
  setActive: (key: NavItemKey, isActive: boolean) =>
    csFetch<void>(urlPath`/nav-items/${key}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  /**
   * Saves a page's text in one language.
   * @param key a page with content: about, help, contact or welcome (NAV_ITEM_CONTENT_KEYS)
   * @param lang the language (SITE_PAGE_LANGS)
   * @param contentMd the text as Markdown; empty is allowed
   * Who: site admin.
   * Returns: nothing (204); 404 when the key has no content.
   */
  setContent: (key: NavItemKey, lang: SitePageLang, contentMd: string) =>
    csFetch<void>(urlPath`/nav-items/${key}/content`, { method: 'PUT', body: JSON.stringify({ lang, contentMd }) }),

  /**
   * Sets the address the contact form mails to.
   * @param email a valid email address. Validated by setContactEmailSchema.
   * Who: site admin.
   * Returns: nothing (204).
   */
  setContactEmail: (email: string) =>
    csFetch<void>('/nav-items/contact/email', { method: 'PUT', body: JSON.stringify({ email }) }),

  /**
   * Shows or hides the form on the contact page.
   * @param showContactForm true to show it
   * Who: site admin.
   * Returns: nothing (204).
   */
  setShowContactForm: (showContactForm: boolean) =>
    csFetch<void>('/nav-items/contact/show-form', { method: 'PUT', body: JSON.stringify({ showContactForm }) }),

  /**
   * Sets the order of the optional pages in the navbar.
   * @param order every key of NAV_ITEM_KEYS exactly once, in the new order.
   *   Validated by setNavItemsOrderSchema.
   * Who: site admin.
   * Returns: nothing (204).
   */
  setOrder: (order: NavItemKey[]) =>
    csFetch<void>('/nav-items/order', { method: 'PUT', body: JSON.stringify({ order }) }),
};
