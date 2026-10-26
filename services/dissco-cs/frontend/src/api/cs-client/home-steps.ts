import { csFetch, csFetchField } from './request';
import { withSite } from '../url';
import { HomeStepDto } from '@dissco-cs/shared-types';

export const homeStepsApi = {
  /**
   * The steps of "How it works" on Home, in their order.
   * Input: none.
   * Who: anyone.
   * Returns: HomeStepDto[]; empty when none are set (Home then leaves the section out).
   */
  list: () => csFetchField<HomeStepDto[]>(withSite('/home-steps'), 'steps'),

  /**
   * Replaces all steps of "How it works" at once; their order is the order on Home.
   * @param steps at most MAX_HOME_STEPS; per step a title and body in every site language.
   *   Validated by setHomeStepsSchema. An empty list removes the section.
   * Who: site admin.
   * Returns: nothing (204).
   */
  replace: (steps: HomeStepDto[]) => csFetch<void>('/home-steps/steps', { method: 'PUT', body: JSON.stringify({ steps }) }),
};
