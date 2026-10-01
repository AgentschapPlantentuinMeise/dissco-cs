import { z } from 'zod';
import { emailSchema } from './common.js';

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(1),
  email: emailSchema,
  message: z.string().trim().min(1),
  website: z.string(), // honeypot -- absence/presence is the signal, not its content
});
export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
