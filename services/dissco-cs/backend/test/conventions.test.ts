import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  commentRules,
  ConventionRule,
  findCommentViolations,
  findUndocumented,
  findViolations,
  violationMessage,
} from '../../test-support/conventions';

// Patterns we cleaned up on purpose (see CLAUDE.md). A failing rule means: change the code as the
// message says. Extend an allowedIn list only with a reason.
const rules: ConventionRule[] = [
  {
    name: 'Error responses are JSON { error }, never plain text',
    pattern: /\b(c|context)\.text\(/,
    instead: "c.json({ error: '...' }, status) -- CLAUDE.md 'Schrijfroutes'",
    allowedIn: { 'app.ts': '/health answers a plain "ok" for the container health check' },
  },
  {
    name: 'Request bodies are not read and validated by hand',
    pattern: /\.req\.json\(/,
    instead: "validateJson(schema) on the route + c.req.valid('json'); a body passed on to Madoc: readJsonBody / forwardJsonBody -- CLAUDE.md 'Schrijfroutes'",
    allowedIn: {
      'madoc-client/client.ts': 'readJsonBody itself',
      'controllers/client-errors.controller.ts': 'public endpoint that always answers 204, an invalid report is silently dropped',
    },
  },
  {
    name: 'Only madoc-client talks HTTP to Madoc',
    pattern: /(^|[^\w.])fetch\(/,
    instead: 'a function in madoc-client/ (serviceJson, madocFetch, ...)',
    allowedIn: { 'madoc-client/': 'the Madoc HTTP layer' },
  },
  {
    name: 'Code that hits an error does not log it itself',
    pattern: /\bconsole\.\w+\(/,
    instead: "throw the error (app.onError + request-log store it), or passErrorOn(c, err) -- CLAUDE.md 'Fouten en logging'",
    allowedIn: {
      'index.ts': 'startup and unhandled rejections, before/outside any request',
      'infrastructure/request-log.ts': 'the one request line on stdout',
      'infrastructure/error-response.ts': 'app.onError, the central error handler',
      'repositories/app-log.repository.ts': 'fallback when app_log itself cannot be written',
      'madoc-db/swr-cache.ts': 'background refresh, outside any request',
      'madoc-client/reviews.ts': 'best-effort enrichment of a review row, the request itself still succeeds',
    },
  },
  {
    name: 'Path params are validated on the route, not by hand',
    pattern: /Number\(c\.req\.param\(/,
    instead: "validateParams({ id: intId }) + c.req.valid('param') -- CLAUDE.md 'Schrijfroutes'",
  },
  {
    name: 'Ids that go into a Madoc URL are checked by validateParams or madocPath',
    pattern: /\bisSafeSegment\(/,
    instead: "validateParams({ x: safeSegment }) on the route, or madocPath for a service-JWT call",
    allowedIn: {
      'madoc-client/': 'isSafeSegment itself and madocPath',
      'infrastructure/validate-params.ts': 'the safeSegment building block',
    },
  },
  {
    name: 'A route that needs the site uses requireSiteId',
    pattern: /Could not resolve site/,
    instead: 'const siteId = await requireSiteId(c); if (siteId instanceof Response) return siteId;',
    allowedIn: { 'auth/auth.ts': 'requireSiteId itself' },
  },
  {
    name: 'One slugify, in shared',
    pattern: /function slugify\b/,
    instead: "import { slugify } from '@dissco-cs/shared-types'",
  },
  {
    name: 'No hand-written language fallback chain',
    pattern: /\.nl \|\|/,
    instead: "firstFilledLang(field) from '@dissco-cs/shared-types' (order of SITE_PAGE_LANGS)",
  },
  {
    name: 'A .logic.ts file stays pure, so its tests need no env vars, database or Madoc',
    pattern: /from ['"](hono|.*\/config\.js|.*\/client\.js|.*\/pools\.js|.*repositories\/.*)['"]/,
    instead: "pass the data in as arguments; fetch it in the controller, madoc-client or repository that calls the logic -- CLAUDE.md 'Tests'",
    onlyIn: /\.logic\.ts$/,
  },
  {
    name: 'No silently swallowed errors',
    pattern: /\.catch\(\(\) => \{\s*\}\)|catch\s*(\(\w*\))?\s*\{\s*\}/,
    instead: 'let the error through, or handle it visibly',
  },
];

describe('backend conventions', () => {
  const srcDir = join(__dirname, '..', 'src');
  const sharedDir = join(__dirname, '..', '..', 'shared', 'types');

  it.each(rules.map(rule => [rule.name, rule] as const))('%s', (_name, rule) => {
    const violations = findViolations(srcDir, rule);
    expect(violations, violationMessage(rule, violations)).toEqual([]);
  });

  // shared/types has no test setup of its own, so its comments are checked from here.
  it.each(commentRules.map(rule => [rule.name, rule] as const))('%s', (_name, rule) => {
    const violations = [...findCommentViolations(srcDir, rule), ...findCommentViolations(sharedDir, rule)];
    expect(violations, violationMessage(rule, violations)).toEqual([]);
  });

  it('Every Madoc call and shared helper has a contract (JSDoc)', () => {
    const missing = [
      ...findUndocumented(join(srcDir, 'madoc-client'), { members: false }),
      ...findUndocumented(sharedDir, { members: false }),
    ];
    const instead = 'a /** */ block: what it does, @param per input, Returns: -- CLAUDE.md §7';
    expect(missing, `Every Madoc call and shared helper has a contract\nInstead: ${instead}\nFound:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});
