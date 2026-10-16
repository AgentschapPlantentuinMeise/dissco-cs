import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  commentRules,
  ConventionRule,
  findCommentViolations,
  findOversizedFiles,
  findUndocumented,
  findViolations,
  violationMessage,
} from '../../test-support/conventions';

// Patterns we cleaned up on purpose (see CLAUDE.md). A failing rule means: change the code as the
// message says. Extend an allowedIn list only with a reason.
const rules: ConventionRule[] = [
  {
    name: 'No console output in production code',
    pattern: /\bconsole\.\w+\(/,
    instead: "reportClientError(err, kind), or let useMutation's MutationCache handle it -- CLAUDE.md 'Fouten en logging'",
    allowedIn: { 'api/cs-client/client-errors.ts': 'reportClientError itself (dev console next to the app_log report)' },
  },
  {
    name: 'Server calls go through the api/ layer',
    pattern: /(^|[^\w.])fetch\(/,
    instead: 'a method in api/cs-client/ (our backend) or api/madoc-auth/',
    allowedIn: {
      'api/': 'the api layer itself',
      'pages/annotate/form/fields/AutocompleteField.tsx': 'external autocomplete source configured in the capture model, not our backend',
    },
  },
  {
    name: 'The api/ layer does not import from hooks, components or pages',
    pattern: /from '(\.\.\/)+(hooks|components|pages)\//,
    instead: 'move what api/ needs into api/ (like api/error-toast.ts); hooks and components import from api/, not the other way round',
    onlyIn: /^api\//,
  },
  {
    name: "A cs-client method that deletes is called delete (or deleteX), not remove",
    pattern: /^\s+remove\w*:/,
    instead: "delete: ... (one kind of thing in the api) or deleteTopic: ... (several kinds)",
    onlyIn: /^api\/cs-client\//,
  },
  {
    name: 'A cs-client method unwraps a one-field answer with csFetchField',
    pattern: /csFetch<\{ \w+: [^;{}]+ \}>\(/,
    instead: "csFetchField<T>(path, 'field') -- the backend answers { field: ... }, the caller gets the value itself",
    onlyIn: /^api\/cs-client\//,
  },
  {
    name: 'A component is a function, not a React.FC',
    pattern: /React\.FC\b|:\s*FC</,
    instead: "function X({ a, b }: XProps) { ... } -- CLAUDE.md §6",
  },
  {
    name: 'One cookie library',
    pattern: /from 'browser-cookies'/,
    instead: "import Cookies from 'js-cookie' (a name with '/' is written by hand, see clearJwt in api/jwt.ts)",
  },
  {
    name: 'One way to build a query string',
    pattern: /from 'query-string'/,
    instead: "withQuery(path, params) from api/url.ts",
  },
  {
    name: 'The site slug is not added to a URL by hand',
    pattern: /slug=\$\{/,
    instead: "withSite(path, params?) from api/url.ts",
  },
  {
    name: 'A cs-client path with a value is built with urlPath, so the value is encoded',
    pattern: /\(`\//,
    instead: "urlPath`/projects/${slug}/manual` from api/url.ts (and withSite/withQuery for the query string)",
    onlyIn: /^api\/cs-client\//,
    allowedIn: { 'api/cs-client/request.ts': 'csFetch puts the already built (and encoded) path behind /api/dissco-cs' },
  },
  {
    name: 'Brand colors are Tailwind tokens, not arbitrary CSS variables',
    pattern: /\[var\(--cs-/,
    instead: "bg-cs-primary, text-cs-dark, border-cs-accent/40, ... (tailwind.config.js); they read the same variables and also allow opacity",
  },
  {
    name: 'No hard-coded brand color: it would ignore the palette set in site management',
    pattern: /#(1a5b66|00a877|139b94|124048|6e3466)\b|rgba?\(\s*(26,\s*91,\s*102|0,\s*168,\s*119|19,\s*155,\s*148|18,\s*64,\s*72|110,\s*52,\s*102)\b/i,
    instead: 'the token with an opacity if needed: bg-cs-primary/[0.07], border-cs-accent/35, hover:shadow-cs-primary/[0.14]',
    allowedIn: {
      'pages/site-management/site-colors/palette.ts': 'the defaults for the colors form; a test keeps them equal to citizen-science-theme.css',
    },
  },
  {
    name: 'Action buttons are <Button>, not a class string of their own',
    pattern: /\b(btnPrimary|btnGhost|outlineButtonClass|pageError(Primary|Secondary)Button)\b/,
    instead: "<Button variant size loading> from components/ui/Button.tsx (buttonClass() for a link that looks like a button)",
  },
  {
    name: 'No pill-shaped buttons: the style guide uses 4px corners',
    pattern: /rounded-full[^"'`]*cursor-pointer|cursor-pointer[^"'`]*rounded-full/,
    instead: "<Button variant size> (components/ui/Button.tsx); a round icon button gets an allowedIn with a reason",
    allowedIn: {
      'components/manuals/PdfLightbox.tsx': 'round icon buttons (previous, next, close) on the dark lightbox',
      'components/ui/Modal.tsx': 'the round close icon of a modal',
    },
  },
  {
    name: 'No refetch: after a write, invalidate',
    pattern: /\brefetch\b/,
    instead: "useMutation with invalidateQueries({ queryKey: xKeys... }) in onSuccess -- CLAUDE.md 'Schrijven naar de server'",
  },
  {
    name: 'MadocInternationalString comes from shared',
    pattern: /type MadocInternationalString\b/,
    instead: "import { MadocInternationalString } from '@dissco-cs/shared-types'",
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
    name: 'Language buttons are <LanguageTabs>',
    pattern: /t\(`lang_\$\{/,
    instead: '<LanguageTabs selected onSelect isMissing /> (components/ui/LanguageTabs.tsx)',
    allowedIn: {
      'components/ui/LanguageTabs.tsx': 'the component itself',
      'pages/site-management/project-management/ManualContentEditor.tsx': 'names the missing languages inside a message, not buttons',
    },
  },
  {
    name: 'One list of site languages',
    pattern: /\bsupportedLanguages\b/,
    instead: "LANGUAGES from utility/site-lang-text (derived from SITE_PAGE_LANGS in shared)",
    allowedIn: {
      'dissco-cs-config.ts': 'defines it from SITE_PAGE_LANGS',
      'utility/site-lang-text.ts': 'exposes it as LANGUAGES',
      'i18n.ts': 'startup language detection, before React',
    },
  },
  {
    name: 'Icons are react-icons, not text glyphs',
    // Typography (— – … ·) is fine; these are characters used as an icon.
    pattern: /[←→↑↓‹›▾▸▴◂✓✔✕✖⟲⟳○]/,
    instead: "an icon from 'react-icons/lu' with aria-hidden=\"true\" (LuArrowLeft, LuChevronDown, LuCheck, LuX, ...)",
  },
  {
    name: 'No inline default text in t()',
    pattern: /\bt\(\s*'[^']*',\s*['"`]/,
    instead: "t('key') with the key in all four translation files -- a missing key falls back to English (fallbackLng), not to inline Dutch",
  },
  {
    name: 'No silently swallowed errors',
    pattern: /\.catch\(\(\) => \{\s*\}\)|catch\s*(\(\w*\))?\s*\{\s*\}/,
    instead: "reportClientError(err, 'action'), or let the error through",
  },
];

describe('frontend conventions', () => {
  const srcDir = join(__dirname, '..', 'src');

  it.each(rules.map(rule => [rule.name, rule] as const))('%s', (_name, rule) => {
    const violations = findViolations(srcDir, rule);
    expect(violations, violationMessage(rule, violations)).toEqual([]);
  });

  it('A component file stays at most 300 lines', () => {
    const oversized = findOversizedFiles(srcDir, { extension: '.tsx', maxLines: 300 });
    const instead =
      "split it like pages/review/: logic in a use-<page>.ts hook, calculation rules as pure functions with a test, parts as components next to it -- CLAUDE.md 'React'";
    expect(oversized, `A component file stays at most 300 lines\nInstead: ${instead}\nFound:\n  ${oversized.join('\n  ')}`).toEqual([]);
  });

  it.each(commentRules.map(rule => [rule.name, rule] as const))('%s', (_name, rule) => {
    const violations = findCommentViolations(srcDir, rule);
    expect(violations, violationMessage(rule, violations)).toEqual([]);
  });

  it('Every call to the backend or Madoc has a contract (JSDoc)', () => {
    const missing = [
      ...findUndocumented(join(srcDir, 'api', 'cs-client'), { members: true }),
      ...findUndocumented(join(srcDir, 'api', 'madoc-auth'), { members: false }).filter(line => !line.startsWith('request.ts')),
    ];
    const instead = 'a /** */ block: what it does, @param per input (or "Input: none."), Who:, Returns: -- CLAUDE.md §7';
    expect(missing, `Every call to the backend or Madoc has a contract\nInstead: ${instead}\nFound:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});
