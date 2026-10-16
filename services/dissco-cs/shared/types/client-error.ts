import { z } from 'zod';

// Where a browser error happened: 'render' = a crash caught by the error boundary, 'query' and
// 'mutation' = a failed server call reported by react-query, 'action' = an error caught in a
// page's own handler (e.g. a failed claim or upload).
export const clientErrorKinds = ['render', 'query', 'mutation', 'action'] as const;
export type ClientErrorKind = (typeof clientErrorKinds)[number];

// The last few things that happened in the browser before the error: page changes and API calls
// (method, path without its query, status) -- never the content of a request or response.
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
