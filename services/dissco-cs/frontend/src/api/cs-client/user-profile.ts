import { csFetch } from './request';

export const userProfileApi = {
  /**
   * Records that the caller uses the site: creates their profile on a first visit, and updates
   * their last activity at most once a day.
   * Input: none.
   * Who: logged-in user.
   * Returns: nothing (204).
   */
  visit: () => csFetch<void>('/user-profile/visit', { method: 'POST' }),
};
