---
inclusion: manual
---

# Technische analyse — dissco-cs

> Gegenereerd op basis van de broncode. Bijwerken na dependency-upgrades of architectuurwijzigingen.

---

## Technologiestack

### Shared (`@dissco-cs/shared-types`)

| Onderdeel        | Keuze            | Versie      |
|------------------|------------------|-------------|
| Taal             | TypeScript       | ^5.9.2      |
| Schema-validatie | Zod              | ^4.6.5      |
| Build            | tsc              | —           |
| Package-manager  | pnpm 9           | —           |

### Backend

| Categorie           | Keuze                   | Versie       |
|---------------------|-------------------------|--------------|
| Runtime             | Node.js (ESM)           | —            |
| HTTP-framework      | Hono                    | ^4.10.5      |
| HTTP-adapter        | @hono/node-server       | ^1.19.5      |
| Database-driver     | pg (node-postgres)      | ^8.16.3      |
| E-mail              | Nodemailer              | ^6.6.3       |
| Schema-validatie    | Zod (via shared)        | ^4.6.5       |
| Taal                | TypeScript              | ^5.9.2       |
| Dev-runner          | tsx (watch)             | ^4.20.5      |
| Testframework       | Vitest                  | ^2.1.9       |
| Package-manager     | pnpm 9                  | —            |

### Frontend

| Categorie           | Keuze                   | Versie       |
|---------------------|-------------------------|--------------|
| UI-framework        | React                   | 19.2.4       |
| Build-tooling       | Vite                    | ^5.4.21      |
| Taal                | TypeScript              | ^5.9.2       |
| Routing             | react-router-dom        | ^7.8.2       |
| Data-fetching       | @tanstack/react-query   | ^5           |
| Styling             | Tailwind CSS            | ^3.3.3       |
| Internationalalisering | i18next + react-i18next | ^19.7.0 / ^11.18.6 |
| IIIF-viewer         | OpenSeadragon           | ^4.1.1       |
| PDF-viewer          | pdfjs-dist              | ^4.6.82      |
| Markdown-rendering  | react-markdown          | ^9.0.1       |
| Grafieken           | Recharts                | ^2.15.4      |
| Iconen              | react-icons             | ^5.5.0       |
| Cookies             | browser-cookies         | ^1.2.0       |
| Package-manager     | pnpm 9                  | —            |

---

## Design patterns

### Shared `@dissco-cs/shared-types`

**Één bron van waarheid voor DTO's én validatie**
Alle wire-shapes (DTO's), Zod-schema's en type-guards leven in `shared/types/`. Backend en frontend importeren allebei uit `@dissco-cs/shared-types` via een pnpm workspace-link. Dit elimineert dubbele typedefinities volledig: een velddefinitie bestaat precies één keer en is onmiddellijk geldig aan beide kanten.

**Bewuste scheiding: Zod alleen voor inkomende HTTP-bodies**
Zod-schema's (`institutionInputSchema`, `forumTopicInputSchema`, etc.) worden alleen gebruikt voor het valideren van request-bodies op de API. Uitgaande DTO's (`InstitutionDto`, `ForumTopicDto`, etc.) zijn gewone TypeScript-types — geen `.parse()` op de uitvoer. Dit is een expliciete keuze: de API is verantwoordelijk voor correcte uitvoer; runtime-validatie van eigen data is overhead zonder voordeel.

**Row-type vs DTO-type scheiding**
Elke repository definieert lokaal een `*Row`-type (bijv. `InstitutionRow`, `NavItemRow`) met PostgreSQL-specifieke veldnamen (`snake_case`, `Date`-objecten voor timestamps). De controller converteert via een `to*Dto()`-functie naar de gedeelde `*Dto`-wire-shape (timestamps als ISO-strings, interne kolommen zoals `created_at` en `updated_at` weggegooid). Dit patroon is consistent door de hele API.

---

### Backend

**Controller-factory's (Hono)**
Elke `*controller.ts` exporteert één factory-functie die een `Hono`-instantie retourneert en precies de repository's ontvangt die die controller gebruikt. `createDisscoCSApp()` in `app.ts` monteert alle controllers via `app.route()`. Geen globale state, makkelijk in isolatie te testen.

**Repository Pattern (raw SQL)**
Alle databaselogica zit in repository-klassen die een `pg.Pool` ontvangen. Geen ORM — uitsluitend parameterized SQL. De `private table(name)` helper bouwt volledig-gekwalificeerde tabelnamen (`"schema".tablename`) zonder string-interpolatie van externe input.

**Handmatige Dependency Injection**
`index.ts` instantieert `DisscoCSDatabase` en `MadocDbPools`, geeft ze door aan `createDisscoCSApp()`, die ze distribueert naar de controllers. Geen IoC-container. Eenvoudig te volgen, eenvoudig te testen.

**Stale-While-Revalidate caching (`SwrCache<K,V>`)**
`swr-cache.ts` is een generieke, sleutelgebaseerde in-memory cache. De eerste `get()`-aanroep voor een sleutel betaalt voor een live query; daarna retourneert elke volgende `get()` de gecachte waarde terwijl een fire-and-forget background-query de cache ververst (max. één refresh tegelijk per sleutel). `peek()` leest de cache zonder ooit een refresh te triggeren — voor polling-eindpunten die zelf geen werk mogen veroorzaken.

**Drie afzonderlijke PostgreSQL-verbindingen**
`DisscoCSDatabase` beheert de eigen pool (`dissco_cs`-schema, `max: 20`). `MadocDbPools` beheert twee readonly pools: één voor `madoc_ts` (vrijwilligersaantallen, projectmetadata) en één voor `tasks_api` (taakaantallen, honour board). Cross-schema queries zijn niet mogelijk door ontbrekende grants — samenvoegen gebeurt in applicatiecode.

**Idempotente in-proces migraties**
`runMigrations()` in `migrations.ts` voert alle DDL (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, bewaakt `ALTER TABLE`) in één transactie uit. Wordt alleen uitgevoerd bij `MIGRATE=true`. Geen extern migratietool; geen migratiegeschiedenisstabel.

**JWT-delegatiemodel**
`auth.ts` parseert de JWT-payload (base64url decode, geen handtekeningverificatie — de Madoc-gateway verifieert vóór doorsturen). Extracteert `userId`, `siteId`, `name` en `scope` uit standaard Madoc-claims (`sub`, `iss`, `name`, `scope`). Twee patronen: `requireUser()` en `requireSiteAdmin()` retourneren ofwel een `MadocUserIdentity` of een kant-en-klare `Response` die de handler direct kan returnen.

**Twee JWT-typen**
User-JWT (van de aanroeper, doorgestuurd naar Madoc voor acties die aan die gebruiker worden toegeschreven) en service-JWT (gelezen van bestandspad, voor de API's eigen server-side computaties). `isSafeSegment()` valideert alle path-parameters die in Madoc-URLs terechtkomen.

**Honeypot + in-memory rate limiting (contactformulier)**
`website`-veld in de contactsubmissie is een honeypot: gevuld → silently 204. Rate limiter: sliding window per `siteId:IP`, max 5 pogingen per 10 minuten. Per-instantie, expliciet gedocumenteerd als niet geschikt voor horizontale schaling.

---

### Frontend

**Drie-laags API-structuur**
1. `api/cs-client/*.ts` — typed `csFetch<T>`-wrappers per domein, één functie per API-eindpunt.
2. `api/queries/*.ts` — `queryOptions()`-objecten (sleutel + queryFn) per domein. Sleutel-hiërarchieën (`projectKeys.all → list → detail → progress`) staan hier, zodat invalidatie altijd correct is.
3. `hooks/` en pages — consumeren de queryOptions, kennen de HTTP-laag niet.

**`csFetch<T>` + `ApiError`**
Centraal fetch-punt in `cs-client/request.ts`. Voegt JWT-header toe, handelt 401 af via `redirectToExpiredLogin()` (navigeert weg, retourneert een nooit-resolvende promise zodat de caller niet een kale foutmelding flitst). Niet-OK responses gooien een `ApiError` met `status`-veld zodat callers kunnen branchen op HTTP-statuscode.

**`@tanstack/react-query v5`**
Server state via `useQuery`/`useMutation`. `queryOptions()` als centraal pattern. Geen directe `fetch()` in componenten. `queryClient.invalidateQueries()` via `useQueryClient()` na mutaties.

**Polling-patroon**
`/current`-eindpunten (stats, honour board) worden periodiek gepolled via `refetchInterval`. `use-polling-window.ts` zet het interval op `null` wanneer het venster niet zichtbaar is. De `/current`-endpoints triggeren nooit een recompute op de server — alleen `peek()` op de SWR-cache.

**Rolgebaseerde routing**
`AuthGate` met `requireAdmin` (synchroon, uit JWT-scope) of `requireReviewer` (asynchroon, één gecachte API-call). `PageGate` leest `use-nav-items` en redirecteert naar `/` als de pagina deactief is. Fail-open: bij laadstoring toont `use-nav-items` alle pagina's als actief.

**JWT-afhandeling client-side**
`getCurrentUser()` parseert de JWT-cookie zonder network-call. Valideert `exp`-claim om te voorkomen dat verlopen cookies nog als "ingelogd" worden gezien — voorkomt overbodige 401-cascades van achtergrond-queries bij navigatie.

**Meertaligheid**
`i18next` met `react-i18next`. Vier talen: NL, EN, FR, DE. UI-strings in `src/translations/`. Domeindata in `MultilingualText` (`Partial<Record<SitePageLang, string>>`), gerenderd via `LocaleString`-component. Platformbranding in `dissco-cs-config.ts`.

---

## Consistentie-observaties

### Wat goed is

- **Row/DTO-scheiding is 100% consistent.** Elke repository heeft zijn eigen lokale `*Row`-type; alle conversie naar de wire-shape zit in de controller (of een losse `to*Dto()`-functie). Nergens wordt een rij-object direct naar de client gestuurd.
- **Zod-validatie op elke schrijfende endpoint.** Geen enkele `POST` of `PUT` in de controllers verwerkt de request-body zonder `.safeParse()`. Zod-schema's staan in `shared/`, beschikbaar voor zowel server als client.
- **Controller-factory's zijn volledig consistent.** Elk bestand in `controllers/` exporteert één factory-functie met dezelfde signatuur. Geen uitzonderingen.
- **Query-key-hiërarchieën zijn consistent.** Elke `api/queries/*.ts` definieert een `*Keys`-object met een `all`-basissleutel, zodat `invalidateQueries({ queryKey: xKeys.all })` altijd correct scope heeft.
- **`ApiError` met statuscode.** De frontend kan bransen op HTTP-statuscode (bijv. 404 op `prepare-claim` vs. echt ontbrekende resource) zonder de foutmelding te parsen.

### Aandachtspunten

- **Geen globale Hono `app.onError()`-handler.** Onafgevangen exceptions in controllers die niet in een try-catch zitten (bijv. een DB-timeout in een synchrone context) produceren een ongecategoriseerde 500 zonder logging. De meeste Madoc-proxy-routes hebben try-catch met `console.error`, de eigen repository-aanroepen niet. Zie feedbacksectie.
- **`react-i18next` versie-mismatch.** Frontend gebruikt `react-i18next@^11.18.6` (oud) terwijl `i18next@^19.7.0` (nieuw) naast staat. `react-i18next` v11 is niet officieel compatibel met `i18next` v19. In de praktijk werkt het, maar upgrades van i18next kunnen dit breken.
- **`js-cookie` en `browser-cookies` beide aanwezig.** `frontend/package.json` bevat beide cookie-libraries. `browser-cookies` wordt actief gebruikt in `jwt.ts`. `js-cookie` heeft een aparte `@types/js-cookie` devDependency maar is nergens zichtbaar in gebruik in de gelezen bestanden. Dode dependency.
- **`query-string@^6.12.1` in frontend.** Verouderde versie (v6 vs. v8+), en `URLSearchParams` is inmiddels natief beschikbaar. Nut onduidelijk — niet aangetroffen in de gelezen bestanden.
- **Bestandsbijlagen als BYTEA in PostgreSQL.** `manual_attachments.file_data` (max 8 MB per bijlage) wordt direct in de database opgeslagen. Functioneel, maar schaalt slecht bij hoge volumes. Geen objectopslag geconfigureerd. De limiet is correct gevalideerd via `attachmentFileSchema`.
- **Rate limiter is per-instantie.** `rate-limit.ts` slaat staat op in een module-level `Map`. Bij horizontaal schalen is de limiet niet gedeeld. Gedocumenteerd in de JSDoc.
- **Geen geautomatiseerde tests aangetroffen.** Vitest is geconfigureerd in het backend-project. Er zijn geen testbestanden zichtbaar in de gescande mappen. Het frontend-project heeft geen testframework geconfigureerd.
- **Migraties groeien in één functie.** `runMigrations()` heeft geen versienummering of migratiegeschiedenisstabel. Bij verdere schema-evolutie worden de bestaande `DO $$...$$`-guards moeilijker te redeneren over de volgorde.
