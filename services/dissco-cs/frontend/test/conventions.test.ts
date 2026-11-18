import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  commentRules,
  ConventionRule,
  findCommentViolations,
  findMissingCounterparts,
  findOversizedFiles,
  findUndocumented,
  findViolations,
  sourceFiles,
  violationMessage,
} from '../../test-support/conventions';

// Patterns we cleaned up on purpose (see CLAUDE.md). A failing rule means: change the code as the
// message says. Extend an allowedIn list only with a reason.
const rules: ConventionRule[] = [
  {
    name: "No browser dialogs: they ignore the site's style and language",
    pattern: /(^|[^\w.]|window\.)(alert|confirm|prompt)\(/,
    instead: 'a red text next to the field (as for site images), or <ConfirmDialog> for a confirmation',
    allowedIn: { 'components/ui/MarkdownToolbar.tsx': 'asks for a link or image URL; there is no own input dialog for it yet' },
  },
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
      'components/announcements/AnnouncementPin.tsx': 'the round megaphone icon in the navbar, tinted while there are new announcements',    },
  },
  {
    name: 'A text field takes its look from inputClass, not a copy of it or a look of its own',
    pattern: /py-\[9px\] px-3 border border-gray-300|border-gray-300 rounded(-[a-z]+)? p-/,
    instead: "inputClass from components/ui/input-styles.ts (add classes after it, e.g. `${inputClass} w-full`)",
    allowedIn: {
      'components/ui/input-styles.ts': 'the one definition',
    },
  },
  {
    name: 'A text that names the platform gets the site name',
    // These translations contain {{platformName}}; a nav link's label can be one of them (nav_about).
    pattern: /t\('(?:nav_about|my_tasks_percentage|dashboard_subtitle)'\)|t\(\w+\.labelKey\)/,
    instead: "t(key, { platformName }) with platformName = useSiteName() (hooks/use-site-name.ts), so the site's own name from site management shows",
  },
  {
    name: 'A management form sits in panelClass',
    pattern: /border border-gray-200 rounded-\[10px\] p-6/,
    instead: 'panelClass from components/ui/panel-styles.ts, or <ListWithPanel> for a form beside a list',
  },
  {
    name: 'A save is confirmed with <SavedNotice>',
    pattern: /t\('common_saved'\)/,
    instead: '<SavedNotice /> (components/ui/SavedNotice.tsx) next to the Save button; in a list, useSavedFlash and savedRowClass on the saved row',
    allowedIn: {
      'components/ui/SavedNotice.tsx': 'the component itself',
    },
  },
  {
    name: 'A row opens its edit form with the pencil, not a text button',
    pattern: />\s*\{t\('common_edit'\)\}/,
    instead: '<IconButton icon={LuPencil} label={t(\'common_edit\')} />, the same in every list',
  },
  {
    name: 'A list row lights up with rowHoverClass, not a hover colour of its own',
    pattern: /hover:bg-gray-50\b/,
    instead: 'rowHoverClass from components/ui/list-styles.ts, so every list row lights up the same way',
  },
  {
    name: 'A row of tabs is <Tabs>',
    pattern: /\btabBtnClass\b|role="tab"|aria-selected/,
    instead: '<Tabs tabs selected onSelect /> (components/ui/Tabs.tsx), or <LanguageTabs> for the site languages',
  },
  {
    name: 'A button that is only an icon is <IconButton>',
    // Other classes may sit in between (a colour, a padding), so a copy with one extra class is caught too.
    pattern: /bg-transparent border-none[^"'`]*cursor-pointer/,
    instead: '<IconButton icon label onClick /> (components/ui/IconButton.tsx); <DeleteIconButton> to delete, <MoveButtons> to reorder; a text button is <Button variant="text">',
    allowedIn: {
      'components/ui/IconButton.tsx': 'the component itself',
      'pages/auth/Register.tsx': 'a text button that looks like a link inside a sentence, not an icon',
      'pages/user-dashboard/FeedbackThreadRow.tsx': 'the whole row of a feedback thread opens it, not an icon',
      'pages/forum/ForumTopicCard.tsx': 'the reply count on the right of a topic opens it, not an icon',
      'pages/review/ReviewTable.tsx': "the submitter's name in a cell filters the list on that person, not an icon",
      'components/iiif/ImagePreviewPopup.tsx': 'a white close icon on the dark image viewer; IconButton is grey and teal, for light backgrounds',
      'components/layout/Toast.tsx': 'a white close icon on the dark toast; IconButton is grey and teal, for light backgrounds',
    },
  },
  {
    name: 'A block that opens and closes is <Disclosure>',
    pattern: /aria-expanded/,
    instead: '<Disclosure title defaultOpen> (components/ui/Disclosure.tsx); Headless UI sets aria-expanded itself',
    allowedIn: {
      'components/ui/Disclosure.tsx': 'the component itself',
      'pages/forum/ForumTopicCard.tsx': 'the forum page decides which topic is open (one at a time, also from a ?topic= link); a Disclosure keeps its own state',
    },
  },
  {
    name: 'The page title is a PageHeader',
    pattern: /<h1\b/,
    instead: '<PageHeader variant="split-banner" | "compact" | "plain" title ...> (components/layout/PageHeader.tsx)',
    allowedIn: {
      'components/layout/PageHeader.tsx': 'the component itself',
      'components/layout/PageError.tsx': 'a full-page error screen with its own layout',
      'components/ui/CsMarkdown.tsx': 'headings inside text written in page management',
    },
  },
  {
    name: 'The content below a PageHeader is a PageSection or a PageBody',
    // cs-main-wrapper has no CSS: it only wrapped the content of the old layout.
    pattern: /cs-main-wrapper/,
    instead: '<PageSection title tone> per part of a public or working page, <PageBody width> on a plain page (login, review, site management) -- CLAUDE.md §6',
  },
  {
    name: 'The honour board is the quarter timeline at the bottom of the page',
    pattern: /HonourBoardSpotlight|HonourBoardPeriodCard|HonourBoardBand/,
    instead: '<HonourBoardTimeline board={useSiteHonourBoard()} /> (components/stats/HonourBoardTimeline.tsx), below the page content',
  },
  {
    name: 'Help on the annotate page opens beside the form, not in a modal',
    // A modal covers the image and the form the volunteer is working on.
    pattern: /<(Manual)?Modal\b/,
    instead: 'a panel in AnnotateSidePanel, opened from AnnotateHelpBar (pages/annotate/); a confirmation is <ConfirmDialog>',
    onlyIn: /^pages\/annotate\//,
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
      'pages/site-management/project-management/ManualForm.tsx': 'names the missing languages inside a message, not buttons',
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
    name: 'A form field with a label is <FormField>',
    pattern: /<label className="(flex flex-col gap-1|block text-sm font-medium)/,
    instead: '<FormField label className> from components/ui/FormField.tsx',
  },
  {
    name: 'A password field is <PasswordInput>, so it can always be shown',
    pattern: /type="password"/,
    instead: '<PasswordInput> from components/auth/PasswordInput.tsx',
  },
  {
    name: 'A write shows its progress with useMutation, not a status of its own',
    pattern: /useState<'idle'|setStatus\('sending'\)/,
    instead: "useMutation: isPending, isError and isSuccess -- CLAUDE.md 'Schrijven naar de server'",
  },
  {
    name: 'No silently swallowed errors',
    pattern: /\.catch\(\(\) => \{\s*\}\)|catch\s*(\(\w*\))?\s*\{\s*\}/,
    instead: "reportClientError(err, 'action'), or let the error through",
  },
  {
    name: 'A cs-client method is named list*, get*, create, update, delete, set* or after its action',
    // madoc-auth is left out on purpose: its names follow Madoc's own routes (change-name -> changeName).
    pattern: /^ {2}(remove|fetch|load|save|choose|pick|add|edit|modify|change|retrieve|store)\w*: (async )?\(/,
    instead: "list* for a list, get* for one thing, create/update/delete, set* for one property, or a verb for an action (visit, prune)",
    onlyIn: /^api\/cs-client\//,
  },
  {
    name: 'A part of a page that fails to load shows <SectionLoadError>',
    pattern: /\bt\('error_load_failed'\)/,
    instead: "<SectionLoadError /> (components/layout/SectionLoadError.tsx); as a toast for an action, reportActionError(err, 'error_load_failed') stays fine",
  },
  {
    name: 'Every /manage page checks for a site admin itself',
    pattern: /path="\/manage[^"]*"\s+element=\{(?!<AuthGate requireAdmin>)/,
    instead: 'element={<AuthGate requireAdmin><Page /></AuthGate>}: the hub alone does not protect a page opened by its URL',
    onlyIn: /^App\.tsx$/,
  },
  {
    name: 'A load error is not an own red line',
    // Catches <p className="... text-danger-600">{t('x_error')}</p> and keys ending in _failed; a validation
    // message names what is wrong (set_password_error_mismatch, sm_institutions_invalid_email) and stays fine.
    pattern: /text-danger-\d+[^"]*">\{t\('\w*_(error|failed)'\)/,
    instead: '<SectionLoadError /> (components/layout/SectionLoadError.tsx) for a part of a page that fails to load',
  },
  {
    name: 'Loading and load errors go through loadState or failedToLoad',
    // isError and status flip back to pending while TanStack retries a failed query, so the page
    // jumps between "loading" and the error; failedToLoad stays true until a load succeeds.
    pattern: /\.isError\b|[{,]\s*isError\b|\bstatus === '(error|pending|success)'|\bisLoading\b/,
    instead:
      'loadState(...queries) or failedToLoad(query) from api/query-state.ts, with <LoadingText />, <SectionLoadError /> or <QueryState>; a whole page that fails shows <PageLoadError />',
    allowedIn: {
      'pages/auth/': "a failed login, registration or password request: a mutation's error, not a load",
    },
  },
  {
    name: 'One loading text',
    pattern: /\bt\('(?!common_loading')\w*loading\w*'\)/,
    instead: "<LoadingText /> for a part of a page, or t('common_loading') where it must stay compact (a card, a side panel)",
  },
  {
    name: 'A signal colour is named after its meaning',
    pattern: /[a-z]-(red|green|amber|orange|yellow|lime|emerald|rose|pink)-\d{2,3}\b/,
    instead: 'danger (errors, required), success (saved), attention (announcements, warnings) or award (the winner), e.g. text-danger-700 -- defined once in tailwind.config.js',
  },
  {
    name: 'No tertiary (plum) colour in new UI',
    pattern: /cs-tertiary|variant="tertiary"/,
    instead: 'teal or green: cs-primary, cs-secondary (Button variant primary or secondary)',
    allowedIn: {
      'components/ui/Button.tsx': 'defines the variant',
      'pages/site-management/site-colors/PalettePreview.tsx': 'shows every colour of the palette',
      'components/capture-models/SubmissionFieldsForm.tsx': 'existing, from before the choice for teal and green',
      'pages/user-dashboard/FeedbackThreadRow.tsx': 'existing, from before the choice for teal and green',
      'pages/review/FeedbackModal.tsx': 'existing, from before the choice for teal and green',
    },
  },
];

// A key is in use when it occurs as a quoted string, when it is a plural form (key_one, key_other) of
// a key in use, or when the code builds it from a fixed start, e.g. t(`sm_honour_board_mode_${mode}`).
// Quoted, so 'honour_board_you_won' does not count as a use of 'honour_board_you'.
function isTranslationKeyUsed(key: string, source: string): boolean {
  const quoted = (text: string) => ["'", '"', '`'].some(quote => source.includes(`${quote}${text}${quote}`));
  if (quoted(key)) return true;
  const singular = key.replace(/_(zero|one|two|few|many|other)$/, '');
  if (singular !== key && quoted(singular)) return true;
  const parts = key.split('_');
  return parts.some((_part, index) => index > 0 && source.includes(`${parts.slice(0, index).join('_')}_\${`));
}

// The path part of the gateway's location for SPA pages: /s/<site>/(about|help|...).
function gatewayPageRoute(conf: string): RegExp {
  const line = conf.split(/\r?\n/).find(text => text.startsWith('location ~ ^/s/[^/]+/('));
  if (!line) throw new Error('no location for the SPA pages in dissco-cs-api.conf');
  return new RegExp(line.slice('location ~ '.length, line.lastIndexOf(' {')));
}

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

  // The Docker build of the frontend has no backend source, so there this one is skipped; it runs
  // in the Claude hook and the pre-commit.
  const controllersDir = join(__dirname, '..', '..', 'backend', 'src', 'controllers');
  it.skipIf(!existsSync(controllersDir))('A controller and its cs-client file have the same name', () => {
    const missing = findMissingCounterparts(
      { dir: controllersDir, suffix: '.controller.ts' },
      { dir: join(srcDir, 'api', 'cs-client'), suffix: '.ts' }
    );
    const instead = "the cs-client mirrors the controllers, like cs-client/forum.ts and forum.controller.ts -- CLAUDE.md 'Schrijfroutes'";
    expect(missing, `A controller and its cs-client file have the same name\nInstead: ${instead}\nFound:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('No unused translation key', () => {
    const source = sourceFiles(srcDir)
      .map(path => readFileSync(path, 'utf8'))
      .join('\n');
    const keys = Object.keys(JSON.parse(readFileSync(join(srcDir, 'translations', 'nl', 'dissco-cs.json'), 'utf8')));
    const unused = keys.filter(key => !isTranslationKeyUsed(key, source));
    const instead = 'remove the key from all four translation files (nl, en, fr, de)';
    expect(unused, `No unused translation key\nInstead: ${instead}\nFound:\n  ${unused.join('\n  ')}`).toEqual([]);
  });

  // nginx only passes the page routes it lists on to the SPA; any other path under /s/<site>/ goes
  // to Madoc, so a missing route shows a Madoc page. The gateway is outside the Docker build of
  // the frontend, so there this one is skipped; it runs in the Claude hook and the pre-commit.
  const gatewayConf = join(__dirname, '..', '..', '..', 'gateway', 'conf.d', 'services', 'dissco-cs-api.conf');
  it.skipIf(!existsSync(gatewayConf))('Every page route is passed on by the gateway', () => {
    const allowed = gatewayPageRoute(readFileSync(gatewayConf, 'utf8'));
    const routes = [...readFileSync(join(srcDir, 'App.tsx'), 'utf8').matchAll(/<Route path="([^"]+)"/g)]
      .map(match => match[1])
      // '/' and the not-found route have a location of their own in the gateway.
      .filter(path => path !== '/' && path !== '*');
    const missing = routes.filter(path => !allowed.test(`/s/site${path.replace(/:\w+/g, 'x')}`));
    const instead = 'add the route to the location for /s/<site>/(...) in services/gateway/conf.d/services/dissco-cs-api.conf';
    expect(missing, `Every page route is passed on by the gateway\nInstead: ${instead}\nFound:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});
