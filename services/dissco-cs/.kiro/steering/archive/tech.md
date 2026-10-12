---
inclusion: manual
---

# Technische analyse — dissco-cs

> Baseline-document gegenereerd op basis van codebase-analyse. Beschrijft gebruikte technologieën, design patterns en consistentie-observaties. Bijwerken na significante refactors of dependency-upgrades.

---

## Technologiestack

### API

| Categorie            | Keuze                        | Versie (package.json) |
|----------------------|------------------------------|-----------------------|
| Runtime              | Node.js (ESM)                | —                     |
| HTTP-framework       | Hono                         | ^4.10.5               |
| HTTP-serveradapter   | @hono/node-server            | ^1.19.5               |
| Database-driver      | pg (node-postgres)           | ^8.16.3               |
| E-mail               | Nodemailer                   | ^6.6.3                |
| Taal                 | TypeScript                   | ^5.9.2                |
| Build                | tsc                          | —                     |
| Dev-runner           | tsx (watch mode)             | ^4.20.5               |
| Testframework        | Vitest                       | ^2.1.9                |
| Package-manager      | pnpm 9                       | —                     |

### Frontend

| Categorie            | Keuze                        | Versie (package.json) |
|----------------------|------------------------------|-----------------------|
| UI-framework         | React                        | 19.2.4                |
| Build-tooling        | Vite                         | ^5.4.21               |
| Taal                 | TypeScript                   | ^5.9.2                |
| Routing              | react-router-dom             | ^7.8.2                |
| Data-fetching / cache| react-query                  | ^2.26.4               |
| Styling              | Tailwind CSS                 | ^3.3.3                |
| Internationalalisering | i18next + react-i18next    | ^19.7.0 / ^11.18.6    |
| IIIF-viewer          | OpenSeadragon                | ^4.1.1                |
| PDF-viewer           | pdfjs-dist                   | ^4.6.82               |
| Markdown-rendering   | react-markdown               | ^9.0.1                |
| Grafieken            | Recharts                     | ^2.15.4               |
| Iconen               | react-icons                  | ^5.5.0                |
| Cookies              | browser-cookies              | ^1.2.0                |
| Package-manager      | pnpm 9                       | —                     |

---

## Design patterns

### API

**Repository Pattern**
Alle databaselogica zit in repository-klassen (`ForumRepository`, `SitePagesRepository`, etc.). Route-handlers nemen repository-instanties als constructor-argument. Geen ORM — uitsluitend raw SQL via `pg.Pool`.

**Factory-functie voor de app**
`createDisscoCSApp()` in `app.ts` is een pure factory: neemt alle repositories als parameters en retourneert een geconfigureerde `Hono`-instantie. Makkelijk te testen in isolatie, zonder dat de server gestart hoeft te worden.

**Dependency Injection (handmatig)**
De vijf repository-instanties worden aangemaakt in `index.ts` en via functieargumenten doorgegeven aan `createDisscoCSApp()` en de individuele route-factory's. Geen IoC-container.

**Route-factory's**
Elke `*routes.ts` exporteert een functie die een `Hono`-instantie retourneert. Die wordt in `app.ts` via `app.route()` gemonteerd. Consistent door de hele API.

**Stale-While-Revalidate (SWR) caching in-memory**
`HonourBoardRepository`, `MadocUsersRepository` en `SiteTaskTotalsRepository` implementeren elk hetzelfde patroon: de eerste request betaalt voor een live query; alle volgende requests krijgen de gecachte waarde terug terwijl een fire-and-forget background refresh de cache bijwerkt. Aangevuld met een `peek*`-variant die nooit een recompute triggert (voor polling-endpoints).

**Cross-schema DB-toegang via aparte connection pools**
Omdat `tasks_api` en `madoc_ts` geen cross-schema grants verlenen aan de `dissco_cs`-gebruiker, opent de API drie afzonderlijke `pg.Pool`-instanties met de eigen credentials van elk schema. De aggregatie van resultaten gebeurt in applicatiecode.

**Ingebouwde migraties**
`DisscoCSRepository.migrate()` voert alle `CREATE TABLE IF NOT EXISTS` en `ALTER TABLE` statements uit in één transactie. Er is geen extern migratietool (zoals Flyway of node-pg-migrate). Omschakelen vereist `MIGRATE=true` in de omgevingsvariabelen.

**Honeypot + in-memory rate limiting**
Het contactformulier gebruikt een honeypot-veld (veld `website` dat legitieme gebruikers nooit invullen) en een sliding-window rate limiter per IP+site. Beide in `contact.routes.ts` en `rate-limit.ts`. De rate limiter is per-instantie — niet geschikt voor horizontaal schalen.

**JWT-gebaseerde authenticatie (Madoc-delegatie)**
De API valideert geen handtekening — ze parseert uitsluitend de JWT-payload (base64url decode, geen verificationstap) om gebruikers-URN en site-URN te extraheren. Vertrouwen is gebaseerd op de Madoc-gateway die alleen geldige tokens doorlaat. Twee helpers: `requireUser()` en `requireSiteAdmin()` retourneren ofwel een `MadocUserIdentity` of een kant-en-klare `Response` die de route direct kan returnen.

**Service JWT voor Madoc-gateway calls**
De API roept de Madoc-gateway aan met een service-JWT die vanuit een bestandspad wordt geladen (`madocServiceJwtPath`). Zie `madoc-client/client.ts`. Hierdoor kan de API namens de service handelen, ongeacht welke gebruiker de request heeft gedaan.

---

### Frontend

**Feature-based paginastructuur**
Elke route heeft zijn eigen map onder `src/pages/`. Co-locatie van page-specifieke hooks (`useReviewTasksController.ts`), stijlen (`review-table-styles.ts`) en sub-componenten binnen die map. Gedeelde componenten staan in `src/components/`.

**react-query v2 voor server state**
Alle API-calls die data ophalen gebruiken `useQuery()`. Mutaties gebruiken `useMutation()` of directe `async`-aanroepen in event-handlers. Query-keys worden soms bewust gedeeld tussen componenten (bijv. `'nav-is-reviewer'` in zowel `Navbar` als `AuthGate`) om dubbele netwerkcalls te voorkomen.

**Centraliseerde API-laag**
`src/api/cs-api.ts` is het enige bestand dat `/api/dissco-cs/*` aanroept. Alle calls gaan via `csFetch<T>()` die automatisch de JWT-header toevoegt, 401 afhandelt met een redirect naar login, en types retourneert. Er is geen directe `fetch()` verspreid door componenten.

**Context API voor globale UI-state**
`SitePagesContext` is het enige gebruikte React Context. Het beheert welke pagina's actief zijn en hun meertalige inhoud. Alle andere state is lokaal (useState) of via react-query.

**Rolgebaseerde toegangscontrole op routeniveau**
`AuthGate` with `requireAdmin` of `requireReviewer` wraps routes in `App.tsx`. Admincheck is synchroon (scope uit JWT); reviewer-check is asynchroon (één API-call, gecached via react-query).

**Fail-open defaults**
Zowel `SitePagesContext` (navigatie toont alle pagina's als actief bij een laadstoring) als `jwt.ts` (exp-check voorkomt stale-cookie 401-cascades) zijn defensief ontworpen om te degraderen naar bruikbare defaults in plaats van te breken.

**Polling-patroon**
De hooks `use-site-stats`, `use-honour-board` en `use-institution-stats` pollen periodiek de `/current`-variant van hun endpoint (die nooit een recompute triggert aan de serverzijde). `use-polling-window.ts` past het interval aan op basis van window-zichtbaarheid.

**Meertaligheid**
`i18next` met `react-i18next`. Vier talen: NL, EN, FR, DE. Taalbestanden staan in `src/translations/`. `LocaleString.tsx` rendert meertalige objecten (`{ nl, en, fr, de }`). Platformbrede branding en taalconfiguratie staan in `dissco-cs-config.ts`.

---

## Consistentie-observaties

### Sterk consistent

- **Route-factories**: elke `*routes.ts` exporteert exact één `function …Routes(): Hono`-factory. Geen uitzonderingen gevonden.
- **Typed API-responses**: alle `csFetch<T>`-calls in `cs-api.ts` hebben een expliciete type-parameter. Geen `any` in de API-laag.
- **JWT-hulpfuncties**: `requireUser()` en `requireSiteAdmin()` worden consequent gebruikt. Geen route-handlers die de JWT-payload zelf parsen buiten `jwt.ts`.
- **Omgevingsvariabelen**: alle config gaat via `config.ts` met expliciete validatie (`required()`, `requiredNumber()`). Geen losse `process.env`-aanroepen in routes of repositories.
- **In-memory SWR-caching**: de drie repositories die externe schemas lezen implementeren allemaal hetzelfde `peek/get/background-refresh`-patroon op identieke wijze.

### Aandachtspunten

- **react-query v2 vs. actueel**: de frontend gebruikt `react-query@2.26.4`, terwijl de huidige stabiele versie v5 is. De v2 API (`useQuery` met losse arguments, geen `queryKey` als array in alle gevallen) wijkt significant af van v4/v5. Upgraden vereist een volledige API-migratie.
- **Geen shared type-package**: API en frontend definiëren typen afzonderlijk. `cs-api.ts` importeert types uit `src/types/`, de API exporteert types via `db.ts`. Er is geen gedeeld schema-validatieformaat (bijv. Zod) dat beide kanten bindt. Inconsistentie tussen backend- en frontend-types is handmatig te houden.
- **Bijlagen opgeslagen als BYTEA in PostgreSQL**: `project_manual_attachments.file_data` slaat bestandsdata direct in de database op. Dit is functioneel maar schaalt minder goed bij grote bestanden of hoog volume. Er is geen objectopslag (S3 e.d.) geconfigureerd.
- **Rate limiter is single-instance**: `rate-limit.ts` slaat pogingen op in een in-memory `Map`. Bij meerdere API-instanties (horizontaal schalen) is de limiet effectief gedeeld noch synchroon. De code bevat een expliciete waarschuwing hierover in een JSDoc-comment.
- **Geen geautomatiseerde integratietests gevonden**: de API heeft Vitest geconfigureerd (`test`-script aanwezig), maar er zijn geen testbestanden aangetroffen in de gescande mappen. De frontend heeft geen testframework geconfigureerd.
- **Frontend madoc-client is een tweede HTTP-client naast cs-api.ts**: `src/api/madoc-client/` roept de Madoc-gateway direct aan (via `request.ts` en `publicRequest()`). Dit is bewust — de CS-API heeft niet alle Madoc-data — maar het betekent dat de frontend twee verschillende foutafhandelingspatronen kent (`ApiError` klasse in `madoc-client/request.ts` vs. gewone `Error` in `cs-api.ts`).
