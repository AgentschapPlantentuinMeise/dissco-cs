# CLAUDE.md — services/dissco-cs

Regels voor backend, frontend en shared samen. De regels die enkel voor één kant gelden, staan in `backend/CLAUDE.md` en `frontend/CLAUDE.md`; de algemene regels in de `CLAUDE.md` in de root.

## 5. TypeScript Practice

- Do prefer explicit interfaces/types for domain entities
- Do use discriminated unions for complex states
- Do use `type` for unions and simple aliases
- Do use `interface` for object shapes and classes
- Do avoid `any` type (use `unknown` if type is truly unknown)
- Don't use implicit types or `any`

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


## Tests (services/dissco-cs)

**Wanneer ze lopen:** na elke edit van Claude (`.claude/hooks/run-related-tests.mjs`; faalt er een, dan herstelt Claude dat eerst), bij elke commit (`.githooks/pre-commit`: tests, `tsc` en in de frontend `lint`; eenmalig activeren per clone met `git config core.hooksPath .githooks`) en in de Docker-build, vóór de build. Voor eigen wijzigingen: de Vitest-extensie in VS Code.

**Wat wel en niet testen:**
- Wel: pure logica — regels, berekeningen, validatie, transformaties.
- Niet: componenttests, nagemaakte Madoc-antwoorden (mocks), tests "voor de coverage". Rekenlogica die in een controller zit eerst uithalen als pure functie, dan pas testen.
- Bij elke bugfix in rekenlogica komt er een test bij die de bug reproduceert.
- **Een bestaande test wijzig je niet zonder toestemming.** Wat een test controleert (verwachte uitkomst, invoer, een `allowedIn`-uitzondering of de test zelf) aanpassen, afzwakken of verwijderen: eerst vragen, met de reden, en wachten op een ja. Een nieuwe test of een nieuwe conventieregel toevoegen mag wel. Enkel een importpad bijwerken omdat een bestand verhuisde: doen, en het melden.
- Faalt een test: ofwel een echte bug (code fixen), ofwel een bewust gewijzigde regel (dan de test aanpassen, na toestemming). Een test die herhaaldelijk breekt zonder ooit een bug te vangen, mag weg, ook na toestemming.

**Conventietests:** `backend/test/conventions.test.ts` en `frontend/test/conventions.test.ts` (scanner in `test-support/conventions.ts`) zijn de lijst met afgesproken patronen: welke bouwsteen, helper of vorm je gebruikt. Die regels staan bewust niet nog eens in dit bestand; faalt er een, dan zegt de melding wat je in de plaats doet.
- Elke ronde die een patroon opruimt of een afspraak maakt, voegt er meteen een regel aan toe — een afspraak die enkel in tekst staat, sluipt terug.
- Een uitzondering (`allowedIn`) komt er enkel bij met een reden.

**Waar (tests):** `<pakket>/test/`, met de mappenstructuur van `src/` gespiegeld (buiten `src/`, zodat `tsc`/`vite build` ze niet meenemen). `.vscode/settings.json` bevat enkel projectinstellingen; persoonlijke instellingen horen in je eigen VS Code User settings.

## Shared (services/dissco-cs)

- Wat backend en frontend delen (types, zod-schema's, helpers), staat in `shared/types/` en wordt overal rechtstreeks uit `@dissco-cs/shared-types` geïmporteerd; geen bestand dat het opnieuw exporteert.
- Na een wijziging in `shared/`: `shared/dist` wissen, `pnpm run build`, en `pnpm install --force` in backend en frontend. De koppeling is een kopie, geen symlink: zonder die stappen werk je met de oude versie.

## Fouten en logging (services/dissco-cs)

1. **Elke request** geeft één regel in stdout (`infrastructure/request-log.ts`). Requests komen niet in de databank.
2. **Elke fout gaat op één plek naar `app_log`**. Code die een fout tegenkomt, logt niet zelf.
   - Backend: gooi de fout gewoon door; `app.onError` + de middleware leggen ze vast. Geen eigen try/catch die enkel logt en 500 geeft. Een eigen try/catch alleen als je iets anders teruggeeft; geef de fout dan door met `passErrorOn(c, err)`, ook als dat antwoord geen 5xx is.
   - Frontend: een `useMutation`-fout wordt centraal gerapporteerd en getoond (`api/query-client.ts`); een andere tekst kies je met `meta: { errorMessage: 'error_delete_failed' }`, en `meta: { handlesOwnError: true }` zet je enkel als de pagina zelf iets anders toont. Een fout in een eigen handler (enkel bij de uitzonderingen in `frontend/CLAUDE.md`, 'Schrijven naar de server') gaat via `reportActionError(err, key)` (`api/error-toast.ts`) of, zonder melding, `reportClientError`.
3. **De gebruiker** ziet bij een mislukte actie een korte, menselijke melding in de taal van de site: een vaste vertaalsleutel (`ErrorMessageKey`), nooit de technische servermelding. De toast toont enkel fouten bij acties. Kan een hele pagina niet laden, dan toont ze `PageError` (`components/layout/PageError.tsx`) met een uitweg (knop), zonder toast erbij; een verwachte situatie (bv. een volzette taak) krijgt daar een eigen tekst, geen foutmelding. Kan één deel van een pagina niet laden, dan neemt `SectionLoadError` zijn plaats in en blijft de rest bruikbaar.

## DTO's (services/dissco-cs)

- **Eigen DTO's zijn camelCase.** De databank blijft snake_case; de vertaling gebeurt op één plek: de mapper.
- **Een mapper somt elk veld expliciet op** — geen `...row`, zodat er nooit een kolom (bv. `site_id`) ongemerkt doorlekt. `backend/test/repositories/mappers.test.ts` controleert de exacte sleutels.
- **De mapper staat onderaan het repository-bestand** van zijn tabel (`// ---- DTO mapping ----`), er is geen aparte `mappers/`-map. Row = vorm van de databank, DTO = vorm van de API.
- **Input en output spiegelen elkaar:** hetzelfde veld heet in het inputschema en in de DTO hetzelfde.
- **Types met voorvoegsel `Madoc*`** beschrijven Madocs eigen antwoorden die we doorgeven en blijven Madocs vorm. Wat wij zelf opbouwen (ook met velden uit Madoc, bv. `ReviewTaskDto`) volgt onze regel.
