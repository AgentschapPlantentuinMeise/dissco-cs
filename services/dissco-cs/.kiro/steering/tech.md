---
inclusion: manual
---

# Technische analyse — dissco-cs

> Gegenereerd op basis van de broncode. Bijwerken na dependency-upgrades of architectuurwijzigingen.

---

## Technologiestack

### Shared (`@dissco-cs/shared-types`)

| Onderdeel        | Keuze      | Versie   |
|------------------|------------|----------|
| Taal             | TypeScript | ^5.9.2   |
| Schema-validatie | Zod        | ^4.6.5   |
| Build            | tsc        | —        |

### Backend

| Categorie           | Keuze                 | Versie     |
|---------------------|-----------------------|------------|
| Runtime             | Node.js (ESM)         | —          |
| HTTP-framework      | Hono                  | ^4.10.5    |
| HTTP-adapter        | @hono/node-server     | ^1.19.5    |
| Zod-integratie      | @hono/zod-validator   | ^0.9.1     |
| Database-driver     | pg (node-postgres)    | ^8.16.3    |
| E-mail              | Nodemailer            | ^6.6.3     |
| Schema-validatie    | Zod (via shared)      | ^4.6.5     |
| Taal                | TypeScript            | ^5.9.2     |
| Dev-runner          | tsx (watch)           | ^4.20.5    |
| Testframework       | Vitest                | ^2.1.9     |
| Package-manager     | pnpm 9                | —          |

### Frontend

| Categorie             | Keuze                   | Versie      |
|-----------------------|-------------------------|-------------|
| UI-framework          | React                   | 19.2.4      |
| Build-tooling         | Vite                    | ^5.4.21     |
| Taal                  | TypeScript              | ^5.9.2      |
| Routing               | react-router-dom        | ^7.8.2      |
| Data-fetching         | @tanstack/react-query   | ^5          |
| Styling               | Tailwind CSS            | ^3.3.3      |
| Accessible UI         | @headlessui/react       | ^2.2.9      |
| Internationalalisering | i18next + react-i18next | ^19.7.0 / ^11.18.6 |
| IIIF-viewer           | OpenSeadragon           | ^4.1.1      |
| PDF-viewer            | pdfjs-dist              | ^4.6.82     |
| Markdown-rendering    | react-markdown          | ^9.0.1      |
| Grafieken             | Recharts                | ^2.15.4     |
| Iconen                | react-icons             | ^5.5.0      |
| Cookies               | js-cookie               | ^3.0.8      |
| Utility               | lodash-es               | ^4.17.21    |
| Testframework         | Vitest                  | ^2.1.9      |
| Package-manager       | pnpm 9                  | —           |

---

## Design patterns

### Shared `@dissco-cs/shared-types`

**Één bron van waarheid voor DTO's, schema's en constanten**
Alle wire-shapes (DTO's), Zod-schema's, type-guards en domein-constanten leven in `shared/types/`. Backend en frontend importeren beiden uit `@dissco-cs/shared-types`. Er zijn geen lokale type-duplicaten voor domeindata in de frontend — `frontend/src/types/` bevat enkel `openseadragon.d.ts`.

**Bewuste scheiding: Zod alleen voor inkomende HTTP-bodies**
Zod-schema's valideren request-bodies en path-params op de API. Uitgaande DTO's zijn gewone TypeScript-types zonder runtime-validatie op de uitvoer — de API is verantwoordelijk voor correcte uitvoer.

---

### Backend

**Controller-factory's met middleware-eerst validatie**
Elke `*controller.ts` exporteert één factory-functie. Route-handlers registreren middleware (`validateJson`, `validateParams`) als eerste argument, vóór de handler-functie. De handler leest de gevalideerde en getypte waarden via `c.req.valid('json')` en `c.req.valid('param')`. Geen handmatige `safeParse()` in handlers.

**`validateJson` en `validateParams` als herbruikbare middleware**
`infrastructure/validate-json.ts` en `validate-params.ts` wikkelen `@hono/zod-validator` in. Bij een invalid body/param geeft de middleware direct `400 { error }` terug (met `z.prettifyError` voor leesbare veldnamen) zonder de handler aan te roepen. Herbruikbare schema-bouwstenen zoals `intId`, `safeSegment`, `siteLang`, `honourBoardPeriod` zitten in `validate-params.ts`.

**Globale foutafhandeling via `app.onError` en `requestLog`**
`app.ts` registreert `app.onError(errorResponse)` — elke onvangst fout wordt `{ error } JSON`. `requestLog` is een middleware op `/api/dissco-cs/*` die elke request logt (stdout) en elke 5xx in de `app_log`-tabel opslaat, inclusief de error. De `passErrorOn(c, err)`-functie laat controllers een error expliciet doorgeven aan de middleware zonder dat de handler zelf 500 antwoordt.

**Repository Pattern (raw SQL, eigen Row-types)**
Elke repository heeft een lokaal `*Row`-type met PostgreSQL-specifieke velden (`Date`, `snake_case`). Controllers converteren via `to*Dto()`-functies naar de gedeelde wire-shape. Dit is consistent in alle repositories.

**`projects.logic.ts` — scheiding van HTTP en domeinlogica**
Complexe berekeningen (manifest-beschikbaarheid, voortgangspercentage) staan in `projects.logic.ts`, apart van `projects.controller.ts`. Deze logica is direct testbaar zonder HTTP-context (`backend/test/controllers/projects.logic.test.ts`).

**Stale-While-Revalidate caching (`SwrCache<K,V>`)**
Één generieke implementatie in `madoc-db/swr-cache.ts`. `peek()` leest de cache zonder een refresh te triggeren (voor polling-endpoints). `get()` retourneert gecachte waarde terwijl een background-refresh loopt (max. één tegelijk per sleutel).

**Structured request-logging + frontend crash-rapportage**
`AppLogRepository` slaat 5xx-fouten op (backend én frontend) in de `app_log`-tabel. De frontend rapporteert crashes, mislukte queries/mutaties en actiefouten via `POST /client-errors` (met breadcrumbs, zonder request/response-inhoud). Rate-limited op 20 per 10 minuten per IP.

**Drie afzonderlijke PostgreSQL-verbindingen**
`DisscoCSDatabase` (eigen schema, max 20 connecties). `MadocDbPools` heeft twee readonly pools (max 5 elk). Cross-schema joins zijn onmogelijk door ontbrekende grants; samenvoegen gebeurt in applicatiecode.

**JWT-delegatiemodel**
`auth/auth.ts` parseert JWT-payload (base64url decode, geen handtekeningverificatie — de Madoc-gateway verifieert). `requireUser()` en `requireSiteAdmin()` retourneren `MadocUserIdentity | Response`. Service-JWT voor serverberekeningen, user-JWT voor doorgestuurde gebruikersacties. `isSafeSegment()` in `madoc-client/path-segment.ts` beschermt alle path-parameters in Madoc-URLs.

---

### Frontend

**Drie-laagse API-structuur**
1. `api/cs-client/*.ts` — typed `csFetch<T>`-wrappers, één functie per eindpunt.
2. `api/queries/*.ts` — `queryOptions()`-objecten per domein (sleutel + queryFn).
3. `hooks/` en `pages/` — consumeren queryOptions.

**Gecentraliseerde QueryClient met globale foutafhandeling**
`api/query-client.ts` definieert de `QueryClient` met `QueryCache.onError` en `MutationCache.onError`. Elke mislukte query/mutatie wordt automatisch gerapporteerd via `reportClientError`. Mutaties tonen ook een toast (via `showError`) tenzij `handlesOwnError: true` op de mutatie staat.

**Globale toast-state buiten React**
`api/error-toast.ts` beheert één actieve toast via een pub/sub-patroon (`subscribeToToast`). Aanroepbaar vanuit overal, ook buiten React-components (QueryClient, action-handlers).

**Breadcrumb-trail voor foutrapportage**
`api/breadcrumbs.ts` houdt de laatste routewijzigingen en API-calls bij (methode, pad, status — nooit inhoud). Bij een foutrapport worden de breadcrumbs meegestuurd.

**ErrorBoundary op app-niveau**
Render-crashes worden opgevangen en gerapporteerd als `'render'`-soort clientfout.

**Polling-patroon**
`/current`-endpoints (stats, honour board, instellingen) worden periodiek gepolled via `refetchInterval`. `use-polling-window.ts` zet het interval op `null` bij onzichtbaar venster.

**Rolgebaseerde routing**
`AuthGate` met `requireAdmin` (synchroon, uit JWT) of `requireReviewer` (asynchroon, gecachte API-call). `PageGate` leest `use-nav-items` en redirecteert bij deactieve pagina's. Fail-open bij laadstoring.

**Meertaligheid**
`i18next` met `react-i18next`, vier talen (NL/EN/FR/DE). UI-strings in `src/translations/`. Domeindata als `MultilingualText` (gedeeld type uit shared).

---

## Consistentie-observaties

### Sterk consistent

- **`validateJson` + `validateParams` op elke schrijvende en param-afhankelijke route.** Alle controllers gebruiken de middleware-helpers. De drie gevallen van handmatige `safeParse()` zijn alle legitiem: `client-errors.controller.ts` (altijd 204 — een broken page mag niet in een loop hangen), `manuals.controller.ts` en `site-images.controller.ts` (multipart-bestandsuploads, geen JSON).
- **Row/DTO-scheiding via `to*Dto()`.** Elke repository heeft lokale Row-types; controllers converteren via naamconvente helper-functies. Geen rijen direct naar de client.
- **`requireUser()` / `requireSiteAdmin()` overal consistent.** Elke controller die auth vereist gebruikt de gecentraliseerde helpers uit `auth/auth.ts`.
- **Controller-factory's identiek.** Elke `*controller.ts` exporteert één factory met dezelfde signatuur.
- **Query-sleutelshiërarchieën.** Elk `api/queries/*.ts` definieert een `*Keys`-object met een `all`-basissleutel voor goede cache-invalidatie.
- **Foutresponsen zijn uniform `{ error }` JSON.** `app.onError` + `validateJson` + `validateParams` + alle handmatige checks gebruiken exact hetzelfde formaat.
- **Conventietests bewaken regressies.** `test-support/conventions.ts` controleert automatisch op verboden patronen in beide pakketten.

### Aandachtspunten

- **`react-i18next@^11` + `i18next@^19` zijn niet officieel compatibel.** `frontend/package.json`: `"i18next": "^19.7.0"` naast `"react-i18next": "^11.18.6"`. De combinatie werkt, maar valt buiten de officiële ondersteuningsmatrix. Upgrade naar `react-i18next@^15` of downgrade `i18next`.
- **BYTEA-bijlagen in PostgreSQL.** Twee tabellen slaan bestanden als BYTEA op: `manual_attachments` (max 8 MB, gevalideerd via `attachmentFileSchema`) en `site_images` (geen expliciete limiet in het schema). Geen objectopslag. Schaalt niet goed bij hoog volume of grote afbeeldingen.
- **Rate limiter is per-instantie.** `infrastructure/rate-limit.ts` gebruikt een module-level `Map`. Bij horizontale schaling is de limiet niet gedeeld. Gedocumenteerd in de code.
- **Migraties zonder versienummering.** `runMigrations()` bevat alle DDL voor twaalf tabellen in één functie, inclusief een `DO $$...$$`-blok voor een oude type-migratie. Geen migratiegeschiedenisstabel; de volgorde en het effect van elke wijziging zijn enkel leesbaar uit de code.
- **`ProjectProgressDto.availableManifests[].label: unknown`.** `shared/types/project.ts`: het veld is getypt als `unknown` terwijl `MadocInternationalString | string` het juiste type is. (`ProjectDebugManifestDto.label` is wel al correct getypt.) Het is bewust — Madoc's label-formaat is inconsistent — maar explicieter typen zou de intentie verduidelijken.
- **Bestandstype-validatie ontbreekt voor manualbijlagen.** `shared/types/manual.ts`: `attachmentFileSchema` valideert alleen bestandsgrootte, niet het MIME-type. `site-images.controller.ts` doet dit wél via `siteImageFileSchema` (alleen `image/*`). Een admin kan elk bestandstype uploaden als manualbijlage; het wordt opgeslagen en teruggestuurd als `application/octet-stream`.
- **`site-theme.repository.ts` heeft geen `toSiteThemeDto()`.** Alle andere repositories bieden een expliciete conversiefunctie; `site-theme.controller.ts` bouwt de `SiteThemeDto` zelf door `toSiteColors(row)` aan te roepen en `row.site_name` direct te lezen. Functioneel correct maar asymmetrisch met het patroon.
- **Geen `isError`-branch op informatieve pages.** `Institutions` en `InstitutionDetail` tonen bij een mislukte query een lege pagina zonder uitleg. De globale `QueryCache.onError` rapporteert de fout, maar de gebruiker krijgt geen zichtbare melding. `AnnotatePage`, `Review` en `UserDashboard` hebben wél expliciete `isError`-afhandeling.
