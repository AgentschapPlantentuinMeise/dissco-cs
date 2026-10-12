---
inclusion: manual
---

# Projectstructuur — dissco-cs

> Gegenereerd op basis van de broncode. Bijwerken na structurele wijzigingen.

---

## Monorepo-indeling (drie werkpakketten)

```
dissco-cs/
├── shared/                     # @dissco-cs/shared-types — gedeeld npm-pakket
│   ├── types/                  # DTO's, Zod-schema's, type-guards
│   └── package.json            # name: @dissco-cs/shared-types, pnpm workspace dep
│
├── backend/                    # Node.js REST-API (Hono)
│   ├── src/
│   │   ├── app.ts              # createDisscoCSApp() — factory, monteert alle controllers
│   │   ├── config.ts           # appConfig — typed env-vars, gevalideerd bij startup
│   │   ├── index.ts            # bootstrap() — startup, graceful shutdown, SIGTERM/SIGINT
│   │   ├── auth/
│   │   │   └── auth.ts         # JWT-parsing, MadocUserIdentity, requireUser/requireSiteAdmin/resolveSiteId
│   │   ├── controllers/        # HTTP-laag — één factory-functie per domein
│   │   ├── repositories/       # Datalaag eigen schema — raw SQL via pg.Pool
│   │   ├── database/
│   │   │   ├── database.ts     # DisscoCSDatabase — één pool, instantieert alle repositories
│   │   │   └── migrations.ts   # runMigrations() — idempotente DDL in één transactie
│   │   ├── madoc-client/       # HTTP-client richting Madoc-gateway (service JWT of user JWT)
│   │   ├── madoc-db/           # Readonly DB-toegang tot Madoc's eigen schema's
│   │   │   ├── pools.ts        # MadocDbPools — twee pg.Pool's: madoc_ts + tasks_api
│   │   │   ├── swr-cache.ts    # SwrCache<K,V> — generieke stale-while-revalidate implementatie
│   │   │   ├── honour-board.repository.ts
│   │   │   └── stats.repository.ts
│   │   └── infrastructure/
│   │       ├── mailer.ts       # Nodemailer singleton
│   │       └── rate-limit.ts   # In-memory sliding-window rate limiter
│   └── package.json
│
└── frontend/                   # React SPA (Vite)
    ├── src/
    │   ├── main.tsx            # React-entrypoint, TanStack Query QueryClient
    │   ├── App.tsx             # BrowserRouter + alle routes
    │   ├── dissco-cs-config.ts # Platformbranding (DoeDat, 4 talen)
    │   ├── api/
    │   │   ├── cs-client/      # Typed fetch-wrappers per domein (één bestand per controller)
    │   │   │   └── request.ts  # csFetch<T>() + ApiError
    │   │   ├── queries/        # TanStack Query queryOptions (keys + queryFn per domein)
    │   │   ├── madoc-auth/     # Directe Madoc-gateway calls (auth, register, wachtwoord)
    │   │   ├── jwt.ts          # getJwt / getCurrentUser / clearJwt / redirectToExpiredLogin
    │   │   └── slug.ts         # getSiteSlug() uit URL
    │   ├── components/
    │   │   ├── layout/         # AuthGate, PageGate, Navbar, CsPage
    │   │   ├── ui/             # Generieke UI-primitieven (knoppen, modals, markdown)
    │   │   ├── auth/           # TermsModal
    │   │   ├── announcements/
    │   │   ├── capture-models/ # Annotatieformulier-veldtypes
    │   │   ├── forum/
    │   │   ├── iiif/           # OpenSeadragon-viewer, PDF-viewer
    │   │   ├── institutions/
    │   │   ├── manuals/
    │   │   ├── projects/       # ProjectCard
    │   │   └── stats/          # StatBanner, HonourBoard-componenten
    │   ├── hooks/              # Custom hooks (react-query wrappers + utility)
    │   ├── pages/              # Feature-mappen (één map per route)
    │   ├── types/              # Alleen openseadragon.d.ts — alle domeintypen komen uit shared
    │   ├── utility/            # Pure hulpfuncties (datum, getal, locale, URN)
    │   └── translations/       # i18next JSON-bestanden (nl/en/fr/de)
    └── package.json
```

---

## Backend — lagen en datastromen

```
index.ts (bootstrap)
  └── createDisscoCSApp(database, statsRepository, honourBoardRepository)
        └── Hono-app
              ├── controllers/*          ← HTTP-laag
              │     ├── eigen repository's (database.*)
              │     └── madoc-client/*   ← gateway-calls
              ├── madoc-db/*             ← directe DB (readonly, andere credentials)
              └── infrastructure/*       ← mailer, rate-limiter
```

### Controllers — route-prefixen en auth

| Controller            | Prefix                          | Auth                        |
|-----------------------|---------------------------------|-----------------------------|
| `navItemsController`  | `/api/dissco-cs/nav-items`      | GET publiek / PUT admin     |
| `contactController`   | `/api/dissco-cs/contact`        | Geen (rate-limit + honeypot)|
| `announcementsController` | `/api/dissco-cs/announcements`| GET publiek / write admin   |
| `institutionsController` | `/api/dissco-cs/institutions` | GET /active publiek / write admin |
| `statsController`     | `/api/dissco-cs/stats`          | Publiek                     |
| `projectsController`  | `/api/dissco-cs/projects`       | Gemengd (zie controller)    |
| `manualsController`   | `/api/dissco-cs/manuals`        | Admin                       |
| `forumController`     | `/api/dissco-cs/forum`          | Ingelogd                    |
| `feedbackController`  | `/api/dissco-cs/feedback`       | Ingelogd / reviewer-gated   |
| `reviewController`    | `/api/dissco-cs/review`         | Ingelogd / reviewer-gated   |
| `tasksController`     | `/api/dissco-cs/tasks`          | Ingelogd (Madoc-proxy)      |
| `iiifController`      | `/api/dissco-cs/iiif`           | Publiek (Madoc-proxy)       |
| `captureModelsController` | `/api/dissco-cs/capture-models` | Ingelogd (Madoc-proxy) |

### DisscoCSDatabase — eigen schema

```
DisscoCSDatabase (database.ts)
  ├── .forum          → ForumRepository         (forum_topics, forum_replies, forum_read_state)
  ├── .navItems       → NavItemsRepository       (nav_items)
  ├── .announcements  → AnnouncementsRepository  (announcements)
  ├── .institutions   → InstitutionsRepository   (institutions, project_institution_links)
  ├── .manuals        → ManualsRepository        (manuals, project_manual_links, manual_attachments)
  └── .feedback       → FeedbackRepository       (feedback_threads, feedback_messages)
```

### MadocDbPools — readonly toegang tot andere schema's

```
MadocDbPools (pools.ts)
  ├── .madocTs   → madoc_ts schema  (iiif_project, iiif_resource, user, site_permission, ...)
  └── .tasksApi  → tasks_api schema (tasks — voor honour board en stats)

Afnemers:
  StatsRepository      → madocTs (volunteers, manifests) + tasksApi (completed counts)
  HonourBoardRepository → tasksApi (crowdsourcing-task rankings)
```

### Databaseschema — eigen tabellen (dissco_cs)

```
forum_topics               – forumberichten
forum_replies              – reacties op topics
forum_read_state           – ongelezen-teller per user per topic
nav_items                  – navigatie-items + pagina-inhoud (Markdown, JSONB per taal)
announcements              – siteberichten met start/einddatum en target-type
institutions               – instellingen met meertalige naam/omschrijving + logo (data-URI)
project_institution_links  – koppeltabel project_slug ↔ institution_id
manuals                    – handleidingen met meertalige titel + inhoud (JSONB)
project_manual_links       – koppeltabel project_slug ↔ manual_id
manual_attachments         – bestandsbijlagen per taal (BYTEA in DB, max 8 MB)
feedback_threads           – privéberichten reviewer → vrijwilliger
feedback_messages          – berichten binnen een thread
```

---

## Frontend — componentenhiërarchie

```
main.tsx
  └── <QueryClientProvider>
        └── <App />
              └── <BrowserRouter basename="/s/{slug}">
                    ├── Auth-routes (geen gate)
                    │     /login, /register, /forgot-password, /set-password,
                    │     /reset-password, /activate-account
                    │
                    ├── Openbare routes
                    │     /               → <Homepage />
                    │     /explore        → <Projects />
                    │     /explore/:slug  → <ProjectDetail />
                    │     /honour-board   → <HonourBoard />
                    │     /find           → <SearchResults />
                    │
                    ├── PageGate-routes (admin kan pagina deactiveren)
                    │     /about          → <PageGate "about"><About />
                    │     /help           → <PageGate "help"><Help />
                    │     /institutions   → <PageGate "institutions"><Institutions />
                    │     /institutions/:slug → <PageGate "institutions"><InstitutionDetail />
                    │     /contact        → <PageGate "contact"><Contact />
                    │
                    ├── AuthGate + PageGate
                    │     /forum          → <PageGate "forum"><AuthGate><Forum />
                    │
                    ├── AuthGate-routes (ingelogd)
                    │     /my-dashboard   → <AuthGate><UserDashboard />
                    │     /explore/:slug/manifests/:manifestId/annotate
                    │                    → <AuthGate><AnnotatePage />
                    │
                    ├── Reviewer-route
                    │     /review         → <AuthGate requireReviewer><Review />
                    │
                    └── Admin-routes
                          /manage         → <AuthGate requireAdmin><SiteManagement />
                          /manage/projects       → <ProjectManagement />
                          /manage/announcements  → <Announcements />
                          /manage/users          → <UserManagement />
                          /manage/pages          → <PageManagement />
                          /manage/institutions   → <InstitutionManagement />
```

### Frontend API-laag (gelaagd)

```
pages / hooks
  └── api/queries/*.ts          ← queryOptions (key + queryFn)
        └── api/cs-client/*.ts  ← typed csFetch<T>-aanroepen
              └── api/cs-client/request.ts  ← csFetch<T>, ApiError
                    └── fetch('/api/dissco-cs/...')

Voor Madoc-gateway calls (auth, claims, tasks, IIIF):
  pages / hooks
    └── api/madoc-auth/*.ts     ← directe fetch naar Madoc-gateway
```

### Hooks

```
hooks/
  use-current-user.ts          – getCurrentUser() (sync, JWT-cookie)
  use-current-project.ts       – react-query: één project op basis van route-slug
  use-nav-items.ts             – react-query: nav-items + isActive(key) helper
  use-project-progress.ts      – react-query: voortgangsstats
  use-site-stats.ts            – react-query: site-brede stats + polling
  use-site-honour-board.ts     – react-query: leaderboard + polling
  use-honour-board-periods.ts  – groepeert alle periodes voor één weergave
  use-polling-window.ts        – past polling-interval aan op zichtbaarheid
  use-route-context.ts         – extraheert slug/manifestId uit URL
```

### Pages — interne structuur (voorbeelden)

```
pages/annotate/
  ├── AnnotatePage.tsx          – claim-lifecycle, abandon bij unmount
  ├── AnnotateLayout.tsx
  ├── form/
  │     ├── CaptureModelForm.tsx
  │     ├── document.ts
  │     └── fields/             – TextField, DropdownField, CheckboxListField, AutocompleteField, …
  └── viewer/
        └── OpenSeadragonViewer.tsx

pages/site-management/
  ├── SiteManagement.tsx        – navigatie-dashboard
  ├── ProjectManagement.tsx     – tabbladen: projecten, handleidingen, stuck tasks, debug
  ├── Announcements.tsx
  ├── PageManagement.tsx
  ├── InstitutionManagement.tsx
  └── UserManagement.tsx

pages/review/
  ├── Review.tsx                – hoofdpagina
  ├── ReviewTable.tsx
  ├── ReviewInlineExpansion.tsx
  ├── ReviewFeedbackModal.tsx
  └── useReviewTasksController.ts
```
