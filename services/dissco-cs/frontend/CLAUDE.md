# CLAUDE.md — services/dissco-cs/frontend

Regels voor de frontend. Zie ook `../CLAUDE.md` (gedeeld met de backend).

## 6. React & Hooks Best Practices

- Do keep hook signatures focused on a single domain
- Do build with the shared building blocks; the conventions tests reject an own version and name the one to use. A component is a plain function, not `React.FC` (inline props and a named `interface XProps` are both fine: never rewrite one into the other). An action button with a label is a `<Button>`; icon buttons, tabs, menu items and toggles are not Buttons
- Do open every page with `<PageHeader>`: `split-banner` for public pages with an image, `compact` for working pages (forum, dashboard, review, help), `plain` for login and site management. Below it, `<PageSection>` blocks on public and working pages (tones alternate page / white / tint), and one `<PageBody>` on a plain page
- Do use `React.memo()` for expensive components, and `useMemo()`/`useCallback()` for expensive calculations
- Do expose imperative handlers via callbacks rather than mutating shared state
- Do prefer composition over prop drilling
- Don't mutate state directly
- Don't store derived values in state (calculate on render instead)
- Do shape a page like `pages/review/`: logic (queries, state, mutations, handlers) in a `use-<page>.ts` hook, calculation rules as pure functions in a `.ts` file with a test, and the parts as small components next to the page
- Do give every page a folder, with the page itself inside (`pages/forum/Forum.tsx`, `pages/site-management/announcements/Announcements.tsx`) — also a page that is a single file today. The folder is named after the page or its domain in kebab-case: pages of the same domain share one folder (`pages/auth/Login.tsx`, `pages/auth/Register.tsx`, `pages/institutions/InstitutionDetail.tsx`, `pages/search/SearchResults.tsx`)
- Do keep the look content-agnostic (no leaves, no "specimens"): the platform is open source and must also work for other kinds of collections

## Schrijven naar de server (services/dissco-cs frontend)

- **URL bouwen:** met `urlPath`, `withQuery` en `withSite` uit `api/url.ts`.
- **Een actie van de gebruiker die schrijft = `useMutation`**, met `mutationFn: () => xApi.y(...)`. Na succes `invalidateQueries` via de key-factory, zodat ook andere pagina's (bv. de publieke lijst) verversen; geeft de server het nieuwe object terug, dan mag `setQueryData`. Laden via `isPending` (en `variables` voor "welke rij").
- **Fout:** niets doen, de `MutationCache` toont de toast. Een extra stap bij een fout (bv. een schakelaar terugzetten) gaat in `onError` van de mutate-aanroep.
- **Bewuste uitzonderingen** (blijven een gewone call, fouten via `reportClientError`):
  - automatische writes zonder klik van de gebruiker: claimen en vrijgeven op de annotatiepagina, `visitForum`, `recordVisit` bij het laden van de app en de prune in projectbeheer
  - bulkacties met een resultaat per item: bulk-accept in review en bulk create
