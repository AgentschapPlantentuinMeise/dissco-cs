import { csFetch } from './request';
import { withSite } from '../url';
import { ContactSubmissionInput } from '@dissco-cs/shared-types';

export const contactApi = {
  /**
   * Mails the contact form to the site's contact address. Max 5 messages per visitor per
   * 10 minutes.
   * @param data name, email and message required; website is a hidden honeypot field that a real
   *   visitor leaves empty (filled in = treated as a bot: answers 204 but sends nothing).
   *   Validated by contactSubmissionSchema.
   * Who: anyone.
   * Returns: nothing (204); 429 too many messages; 503 no contact address set for this site;
   *   502 the mail could not be sent.
   */
  send: (data: ContactSubmissionInput) =>
    csFetch<void>(withSite('/contact'), { method: 'POST', body: JSON.stringify(data) }),
};
