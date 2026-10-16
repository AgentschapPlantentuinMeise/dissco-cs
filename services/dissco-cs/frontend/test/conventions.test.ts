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
