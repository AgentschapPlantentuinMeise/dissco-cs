# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.


## Verplichte aankondiging voor elke code-aanpassing

Voordat je ENIGE file aanpast (edit, create, delete) — ook bij kleine fixes — 
schrijf je eerst, als gewone tekst in je antwoord, dit blokje:

**Probleem:** [wat is er kapot/ontbrekend, in 1-2 zinnes, concreet — geen 
herhaling van de user-vraag maar de technische oorzaak die je hebt gevonden]
**Aanpak:** [welke file(s), welke functie/regel, wat verandert er]
**Risico:** [wat zou er kunnen breken, of "geen" als je dat zeker weet]

Pas NA dit blokje mag je de edit-tool aanroepen. Dit geldt voor elke 
aanpassing, ook losse one-liners. Geen plan mode, geen apart bestand — 
gewoon deze 3 regels inline in je antwoord, elke keer opnieuw.

Als je dit blokje overslaat, is dat een fout — corrigeer het direct zodra 
het wordt opgemerkt.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code. (Single use = written once. Code that already repeats is the opposite case, see below.)
- **Second time = shared helper.** About to write the same block a second time (validation, a fetch, error handling, a piece of UI)? Extract it right away into a shared helper or component and use it in both places. Never copy a neighbouring file's block "because that's how it's done there".
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. TypeScript Practice

- Do prefer explicit interfaces/types for domain entities
- Do use discriminated unions for complex states
- Do use `type` for unions and simple aliases
- Do use `interface` for object shapes and classes
- Do avoid `any` type (use `unknown` if type is truly unknown)
- Don't use implicit types or `any`

## 6. React & Hooks Best Practices

- Do keep hook signatures focused on a single domain
- Do declare a component as `function X({ a, b }: XProps)`, not `const X: React.FC<XProps>` (`frontend/test/conventions.test.ts` checks it)
- Do make every action button with a label a `<Button variant size loading>` (`components/ui/Button.tsx`, `buttonClass()` for a link that looks like one), never own button classes or a pill shape; icon buttons, tabs, menu items and toggles are not Buttons (style guide, section "Bedieningselementen")
- Do use `React.memo()` for expensive components
- Do use `useMemo()` and `useCallback()` for expensive calculations
- Do expose imperative handlers via callbacks rather than mutating shared state
- Do memoize expensive computations to align with performance expectations
- Do prefer composition over prop drilling
- Don't mutate state directly
- Don't store derived values in state (calculate on render instead)
- Do shape a page like `pages/review/`: logic (queries, state, mutations, handlers) in a `use-<page>.ts` hook, calculation rules as pure functions in a `.ts` file with a test, and the parts as small components next to the page
- Don't let a `.tsx` file grow beyond 300 lines (`frontend/test/conventions.test.ts` checks it)
- Do give every page its own folder, named after the component in kebab-case, with the page itself inside (`pages/forum/Forum.tsx`, `pages/site-management/announcements/Announcements.tsx`) — also a page that is a single file today

## 7. Comments

- Always in English.
- A comment explains *why*, and only what the code cannot show itself:
  - a quirk from outside (Madoc stores "required" as `['on']`, not `true`)
  - an order or race you cannot see (`hasSaved` is set before the network call, or a release could abandon a task being saved)
  - a workaround (React's `onWheel` cannot `preventDefault()`, hence a real DOM listener)
  - a deliberate exception to a rule: every `eslint-disable` and every `allowedIn` gets a reason
- One or two lines at the top of a hook, component or module saying what it is for: allowed, not required.
- Not in a comment:
  - what the code does — if that is unclear, improve the name or the code
  - history and project management (phases, ACs, "used to…", "see discussion") — that goes in the commit or PR
  - who calls it ("used by X and Y") — it goes stale
  - commented-out code
- A comment that stays must be clear to someone who does not know Madoc: full sentences saying what happens, why, and what breaks if you change it. Explain a Madoc term (scope, claim, subject_parent, …) or give an example. Clear beats short.
- A long story (history, a design discussion) belongs in the commit, CLAUDE.md or `docs/` — or the code can be simpler.

**Contract on functions between two layers.** Every method in `frontend/src/api/cs-client/`, every exported function of `backend/src/madoc-client/` and every exported helper in `shared/types/` gets a JSDoc block (`/** */`, shown when hovering a call in VS Code):

```ts
/**
 * Adds a reply in the caller's name; the topic then counts as fully read for the caller.
 * @param topicId id of the topic (ForumTopicDto.id)
 * @param body the reply text, not empty. Validated by forumReplyInputSchema.
 * Who: logged-in user.
 * Returns: the new ForumReplyDto (201); 404 unknown topic; 403 when the topic is closed.
 */
```

In this order:
- What it does, in one sentence, including side effects (marks as read, sends a mail, releases a claim).
- Input, always: one `@param` per parameter — what it is, where the value comes from (`ForumTopicDto.id`), its limits. A body object: its required and optional fields, and the zod schema that validates it (or "passed on to Madoc unchecked"). No parameters: `Input: none.`
- `Who:` who may call it (anyone, logged in, reviewer, site admin) — only for cs-client.
- `Returns:` what comes back, plus the error statuses the caller acts on (404, 409, …). Not the usual 400/401/500.
- The contract lives on the cs-client method, not on the controller route: the cs-client mirrors the controller 1:1, and the route already shows its guard, validation and status. A controller only keeps *why* comments.
- Before writing or rewriting a comment or contract, check the claim against the code (and madoc-ts's source for Madoc behaviour). Never rephrase an existing comment without checking it.
- The conventions tests check what a test can see: comments in English, no phases/ACs/"see … discussion", and a JSDoc on every cs-client, madoc-auth and madoc-client function and shared helper.


Keep in mind that the structure en code we provide is in a open source context 

## Rules for my fork: Surgical Changes
- **Scope:** "Upstream" in deze sectie betekent uitsluitend `services/madoc-ts` (Digirati's Madoc-code). Deze surgical/no-refactor-regels gelden NIET voor `services/dissco-cs` — dat is onze eigen, custom service. Daar geldt gewoon: doe wat de user vraagt, geen extra terughoudendheid.
- **Touch only what you must:** Wijzig alleen de specifieke bestanden die direct nodig zijn voor jouw aftakking. Laat upstream (`services/madoc-ts`) code intact.
- **Geen upstream refactoring:** Ruim geen oude code, comments of 'dead code' op in originele upstream (`services/madoc-ts`) bestanden.
- **Isoleren van features:** Probeer nieuwe Madoc-features in een aparte map te bouwen in plaats van bestaande `services/madoc-ts`-bestanden te overschrijven — `services/dissco-cs` is al die aparte map.


# Claude Code Richtlijnen
- Start alleen een subagent als een taak strikt parallelle verwerking of diepgaand onderzoek in meerdere mappen vereist.
- Voer routinematige code-aanpassingen, tests en bestandswijzigingen rechtstreeks uit in de hoofdsessie.

## Tests (services/dissco-cs)

**Wanneer ze lopen — drie lagen, zodat een falende test nooit pas bij een release opduikt:**
1. *Tijdens het coderen:* na elke edit van Claude draait `.claude/hooks/run-related-tests.mjs` de tests die bij het gewijzigde bestand horen; faalt er een, dan herstelt Claude dat eerst. Voor eigen wijzigingen: de Vitest-extensie in VS Code (aanbevolen via `.vscode/extensions.json`, draait bij elke opslag).
2. *Bij elke commit:* `.githooks/pre-commit` draait tests + `tsc` (+ `lint` in frontend) voor elk dissco-cs-pakket met gestagede wijzigingen. **Eenmalig activeren per clone:** `git config core.hooksPath .githooks`. Bewust overslaan: `git commit --no-verify`.
3. *Docker-build:* vangnet, draait `pnpm test` vóór de build.

**Wat wel en niet testen:**
- Wel: pure logica — regels, berekeningen, validatie, transformaties.
- Niet: componenttests, nagemaakte Madoc-antwoorden (mocks), tests "voor de coverage". Rekenlogica die in een controller zit eerst uithalen als pure functie, dan pas testen.
- Bij elke bugfix in rekenlogica komt er een test bij die de bug reproduceert.
- Faalt een test: ofwel een echte bug (code fixen), ofwel een bewust gewijzigde regel (test in dezelfde wijziging aanpassen). Een test die herhaaldelijk breekt zonder ooit een bug te vangen, mag weg.

**Conventietests:** `backend/test/conventions.test.ts` en `frontend/test/conventions.test.ts` (scanner in `test-support/conventions.ts`) zoeken in `src/` naar patronen die we bewust opgeruimd hebben (bv. `c.text(`, `console.log`, `refetch`) en zeggen wat je in de plaats doet. De Claude-hook draait ze na elke edit, de pre-commit en Docker-build via `pnpm test`.
- Elke ronde die een patroon opruimt, voegt er meteen een regel aan toe — een afspraak die enkel in tekst staat, sluipt terug.
- Faalt een regel: pas de code aan zoals de melding zegt. Een uitzondering (`allowedIn`) komt er enkel bij met een reden.

**Waar (tests):** `<pakket>/test/`, met de mappenstructuur van `src/` gespiegeld (buiten `src/`, zodat `tsc`/`vite build` ze niet meenemen). `.vscode/settings.json` bevat enkel projectinstellingen; persoonlijke instellingen horen in je eigen VS Code User settings.




## Fouten en logging (services/dissco-cs)

1. **Elke request** geeft één regel in stdout (`infrastructure/request-log.ts`). Requests komen niet in de databank.
2. **Elke fout gaat op één plek naar `app_log`**. Code die een fout tegenkomt, logt niet zelf.
   - Backend: gooi de fout gewoon door; `app.onError` + de middleware leggen ze vast. Geen eigen try/catch die enkel logt en 500 geeft. Een eigen try/catch alleen als je iets anders teruggeeft; is dat een 5xx, geef de fout dan door met `passErrorOn(c, err)`.
   - Frontend: geen `console.log`/`console.error` in productiecode. Een `useMutation`-fout wordt centraal gerapporteerd en getoond (`api/query-client.ts`); een andere tekst kies je met `meta: { errorMessage: 'error_delete_failed' }`, en `meta: { handlesOwnError: true }` zet je enkel als de pagina zelf iets anders toont. Een fout in een eigen handler (enkel bij de uitzonderingen hieronder) gaat via `reportActionError(err, key)` (`api/error-toast.ts`) of, zonder melding, `reportClientError`.
3. **De gebruiker** ziet bij een mislukte actie een korte, menselijke melding in de taal van de site: een vaste vertaalsleutel (`ErrorMessageKey`), nooit de technische servermelding. De toast toont enkel fouten bij acties. Kan een hele pagina niet laden, dan toont ze `PageError` (`components/layout/PageError.tsx`) met een uitweg (knop), zonder toast erbij; een verwachte situatie (bv. een volzette taak) krijgt daar een eigen tekst, geen foutmelding.

## Schrijven naar de server (services/dissco-cs frontend)

- **URL bouwen (`api/url.ts`):** een pad met een waarde = `` urlPath`/projects/${slug}` `` (codeert elke waarde); querystring = `withQuery(path, { a, b })` (laat `undefined`/`null` weg); de site-slug = `withSite(path, params?)`. Nooit `?slug=` of `encodeURIComponent` met de hand, en geen `query-string`.
- **Een actie van de gebruiker die schrijft = `useMutation`**, met `mutationFn: () => xApi.y(...)`. Geen `await xApi.y()` in een eigen try/catch.
- **Na succes:** in `onSuccess` `invalidateQueries({ queryKey: xKeys.… })` via de factory, zodat ook andere pagina's (bv. de publieke lijst) verversen. Geeft de server het nieuwe object terug, dan mag `setQueryData`. Nooit `refetch()`, en nooit een `refetch`-functie als prop doorgeven.
- **Laden:** `isPending` (en `variables` voor "welke rij"), geen eigen `useState` voor saving/loading/error.
- **Fout:** niets doen, de `MutationCache` toont de toast. Een extra stap bij een fout (bv. een schakelaar terugzetten) gaat in `onError` van de mutate-aanroep.
- **Bewuste uitzonderingen** (blijven een gewone call, fouten via `reportClientError`):
  - automatische writes zonder klik van de gebruiker: claimen en vrijgeven op de annotatiepagina, `visitForum` en de prune in projectbeheer
  - bulkacties met een resultaat per item: bulk-accept in review en bulk create

## Schrijfroutes (services/dissco-cs backend)

- **Body valideren:** `validateJson(schema)` (`infrastructure/validate-json.ts`) als middleware op de route, met het gedeelde zod-schema; in de handler `c.req.valid('json')`. Nooit `c.req.json()` + `safeParse` met de hand. Een body die we ongevalideerd aan Madoc doorgeven (Madoc valideert zelf): `forwardJsonBody` of `readJsonBody` (`madoc-client/client.ts`).
- **Padparameters en site:** `validateParams({ id: intId, projectId: safeSegment, lang: siteLang })` (`infrastructure/validate-params.ts`) op de route, gelezen met `c.req.valid('param')`; nooit `c.req.param(...)` of een `isX`-controle met de hand; voor een vaste lijst (periode, nav-key, taal) is er een bouwsteen (`honourBoardPeriod`, `navItemKey`, `siteLang`). Een route die de site nodig heeft: `requireSiteId(c)` (`auth/auth.ts`), zoals `requireUser` en `requireReviewerOrAdmin`.
- **Fouten zijn altijd `{ error: string }`-JSON**, net als Madoc: `c.json({ error: '...' }, status)`. Ook 404 (`c.notFound()`, via `app.notFound`) en onverwachte fouten (`errorResponse` in `app.onError`). De tekst is voor ontwikkelaars en logs; de gebruiker ziet een vertaalde sleutel.
- **Werkwoorden:** `POST` = aanmaken of een actie, `PUT` = een ding volledig vervangen, `PATCH` = een deel wijzigen, `DELETE` = verwijderen.
- **Antwoord:** aanmaken → `201` + DTO; wijzigen, verwijderen of een actie → `204`. Enkel als de frontend het resultaat echt gebruikt, geef je het terug (bv. forumtopic sluiten → `closedAt`, prune → `{ removed }`).

## DTO's (services/dissco-cs)

- **Eigen DTO's zijn camelCase.** De databank blijft snake_case; de vertaling gebeurt op één plek: de mapper.
- **Een mapper somt elk veld expliciet op** — geen `...row`, zodat er nooit een kolom (bv. `site_id`) ongemerkt doorlekt. `backend/test/repositories/mappers.test.ts` controleert de exacte sleutels.
- **De mapper staat onderaan het repository-bestand** van zijn tabel (`// ---- DTO mapping ----`), er is geen aparte `mappers/`-map. Row = vorm van de databank, DTO = vorm van de API.
- **Input en output spiegelen elkaar:** hetzelfde veld heet in het inputschema en in de DTO hetzelfde.
- **Types met voorvoegsel `Madoc*`** beschrijven Madocs eigen antwoorden die we doorgeven en blijven Madocs vorm. Wat wij zelf opbouwen (ook met velden uit Madoc, bv. `ReviewTaskDto`) volgt onze regel.
