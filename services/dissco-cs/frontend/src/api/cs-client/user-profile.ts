import { csFetch } from './request';
import { SitePageLang, UserProfileDto } from '@dissco-cs/shared-types';

export const userProfileApi = {
  /**
   * The caller's own profile.
   * Input: none.
   * Who: logged-in user.
   * Returns: UserProfileDto; without a profile yet, preferredLanguage is null.
   */
  get: () => csFetch<UserProfileDto>('/user-profile'),

  /**
   * Records that the caller uses the site: creates their profile on a first visit, and updates
   * their last activity at most once a day.
   * Input: none.
   * Who: logged-in user.
   * Returns: UserProfileDto, so the page load can apply the preferred language.
   */
  visit: () => csFetch<UserProfileDto>('/user-profile/visit', { method: 'POST' }),

  /**
   * Sets the caller's preferred language, for every browser they log in on.
   * @param language a site language, or null for no preference. Validated by setPreferredLanguageSchema.
   * Who: logged-in user.
   * Returns: nothing (204).
   */
  setLanguage: (language: SitePageLang | null) =>
    csFetch<void>('/user-profile/language', { method: 'PUT', body: JSON.stringify({ language }) }),

  /**
   * Puts the caller's current name on their forum and feedback messages, on every site. Call it
   * after changeName, which renews the JWT this name is read from.
   * Input: none.
   * Who: logged-in user.
   * Returns: nothing (204).
   */
  syncName: () => csFetch<void>('/user-profile/sync-name', { method: 'POST' }),
};
