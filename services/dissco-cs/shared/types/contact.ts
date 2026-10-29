import { z } from 'zod';
import { emailSchema } from './common.js';

export const MAX_CONTACT_NAME_LENGTH = 100;
export const MAX_CONTACT_MESSAGE_LENGTH = 5_000;

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(MAX_CONTACT_NAME_LENGTH),
  email: emailSchema,
  message: z.string().trim().min(1).max(MAX_CONTACT_MESSAGE_LENGTH),
  website: z.string(), // honeypot -- absence/presence is the signal, not its content
});
export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
