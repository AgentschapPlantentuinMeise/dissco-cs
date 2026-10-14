import { z } from 'zod';

// render = error boundary, query/mutation = react-query caches, action = a caught error in a
// page's own handler (e.g. a claim or upload that failed).
export const clientErrorKinds = ['render', 'query', 'mutation', 'action'] as const;
export type ClientErrorKind = (typeof clientErrorKinds)[number];

// The last few things that happened in the browser before the error -- page changes and API calls
// (method, path, status), never any request or response content.
export const breadcrumbSchema = z.object({
  at: z.string().max(40),
  type: z.enum(['route', 'api']),
  text: z.string().max(200),
});
export type Breadcrumb = z.infer<typeof breadcrumbSchema>;

export const clientErrorSchema = z.object({
  kind: z.enum(clientErrorKinds),
  message: z.string().max(1000),
  stack: z.string().max(4000).optional(),
  url: z.string().max(500),
  breadcrumbs: z.array(breadcrumbSchema).max(10),
});
export type ClientErrorInput = z.infer<typeof clientErrorSchema>;
