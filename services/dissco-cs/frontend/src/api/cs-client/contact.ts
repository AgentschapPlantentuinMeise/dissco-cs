import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { ContactSubmissionInput } from '@dissco-cs/shared-types';

export const contactApi = {
  send: (data: ContactSubmissionInput) =>
    csFetch<void>(`/contact?slug=${getSiteSlug()}`, { method: 'POST', body: JSON.stringify(data) }),
};
