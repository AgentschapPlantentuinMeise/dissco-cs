---
inclusion: manual
---

# Projectstructuur — dissco-cs

> Gegenereerd op basis van de broncode. Bijwerken na structurele wijzigingen.

---

## Monorepo-indeling (vier werkpakketten)

```
dissco-cs/
├── shared/                     # @dissco-cs/shared-types — gedeeld npm-pakket
│   ├── types/                  # DTO's, Zod-schema's, type-guards
│   └── package.json            # name: @dissco-cs/shared-types, pnpm workspace dep
│
├── backend/                    # Node.js REST-API (Hono)
│   ├── src/                    # Broncode
│   ├── test/                   # Vitest-testbestanden (naast src/, spiegelt de mapstructuur)
│   └── package.json
│
├── frontend/                   # React SPA (Vite)
│   ├── src/                    # Broncode
│   ├── test/                   # Vitest-testbestanden
│   └── package.json
│
└── test-support/               # Gedeelde test-utilities
    └── conventions.ts          # Automatische conventiecontroles (console.log, commentaaltaal, bestandsgrootte, JSDoc)
```

---

## Backend — mappenstructuur

```
backend/src/
  app.ts              # createDisscoCSApp() — factory, requestLog + onError + alle routes
  config.ts           # appConfig — typed env-vars, gevalideerd bij startup
  index.ts            # bootstrap() — startup, graceful shutdown
  auth/
    auth.ts           # JWT-parsing, MadocUserIdentity, requireUser / requireSiteAdmin / resolveSiteId
  controllers/        # HTTP-laag — één factory-functie per domein
    announcements.controller.ts
    capture-models.controller.ts
    client-errors.controller.ts  # Frontend crash-rapportage (POST /client-errors)
    contact.controller.ts
    feedback.controller.ts
    forum.controller.ts
    home-steps.controller.ts     # "How it works" stappen (POST /home-steps)
    iiif.controller.ts
    institutions.controller.ts
    manuals.controller.ts
    nav-items.controller.ts
    projects.controller.ts
    projects.logic.ts            # Pure berekeningen losgekoppeld van HTTP (bijv. progress)
    review.controller.ts
    site-images.controller.ts    # Site-afbeeldingen (logo, hero, achtergrond)
    site-theme.controller.ts     # Brandingkleuren + sitenaam
    stats.controller.ts
    tasks.controller.ts
  repositories/       # Datalaag eigen schema — raw SQL via pg.Pool
    announcements.repository.ts
    app-log.repository.ts        # Structureel logboek (backend 5xx + frontend crashes)
    feedback.repository.ts
    forum.repository.ts
    home-steps.repository.ts
    institutions.repository.ts
    manuals.repository.ts
    nav-items.repository.ts
    site-images.repository.ts
    site-theme.repository.ts
  database/
    database.ts       # DisscoCSDatabase — één pool, instantieert alle repositories
    migrations.ts     # runMigrations() — idempotente DDL in één transactie
  madoc-client/       # HTTP-calls richting Madoc-gateway (service JWT of user JWT)
    client.ts         # madocFetch, relayMadocResponse, forwardJsonBody, publicSitePath
    collections.ts
    path-segment.ts   # isSafeSegment — path injection-preventie
    projects.ts
    reviews.ts
    site.ts
    tasks.ts
    users.ts
  madoc-db/           # Readonly DB-toegang tot Madoc's eigen schema's
    honour-board.repository.ts
    pools.ts          # MadocDbPools — twee pg.Pool's: madoc_ts + tasks_api
    swr-cache.ts      # SwrCache<K,V> — generieke stale-while-revalidate
    stats.repository.ts
  infrastructure/
    describe-error.ts   # Fout → { message, stack } — gedeeld door logging en tests
    error-response.ts   # app.onError handler — elke onvangst 5xx wordt { error } JSON
    mailer.ts           # Nodemailer singleton
    rate-limit.ts       # In-memory sliding-window rate limiter
    request-log.ts      # Per-request stdout + app_log 5xx middleware
    validate-json.ts    # validateJson(schema) — @hono/zod-validator wrapper
    validate-params.ts  # validateParams(shape) + herbruikbare schema-bouwstenen
```

### DisscoCSDatabase — eigen schema (repositories)

```
DisscoCSDatabase
  ├── .forum          → ForumRepository          (forum_topics, forum_replies, forum_read_state)
  ├── .navItems       → NavItemsRepository        (nav_items)
  ├── .announcements  → AnnouncementsRepository   (announcements)
  ├── .institutions   → InstitutionsRepository    (institutions, project_institution_links)
  ├── .manuals        → ManualsRepository         (manuals, project_manual_links, manual_attachments)
  ├── .feedback       → FeedbackRepository        (feedback_threads, feedback_messages)
  ├── .appLog         → AppLogRepository          (app_log)
  ├── .siteTheme      → SiteThemeRepository       (site_theme)
  ├── .siteImages     → SiteImagesRepository      (site_images)
  └── .homeSteps      → HomeStepsRepository       (home_steps)
```

### MadocDbPools — readonly toegang (externe schema's)

```
MadocDbPools
  ├── .madocTs   → madoc_ts schema  (iiif_project, iiif_resource, user, site_permission, ...)
  └── .tasksApi  → tasks_api schema (tasks — voor honour board en stats)

Afnemers:
  StatsRepository       → madocTs (volunteers, manifests) + tasksApi (completed counts)
  HonourBoardRepository → tasksApi (crowdsourcing-task rankings)
```

### Controllers — route-prefixen en auth

| Controller                | Prefix                             | Auth                         |
|---------------------------|------------------------------------|------------------------------|
| `clientErrorsController`  | `/api/dissco-cs/client-errors`     | Geen (rate-limit)            |
| `navItemsController`      | `/api/dissco-cs/nav-items`         | GET publiek / PUT admin      |
| `contactController`       | `/api/dissco-cs/contact`           | Geen (rate-limit + honeypot) |
| `siteThemeController`     | `/api/dissco-cs/site-theme`        | GET publiek / PUT admin      |
| `siteImagesController`    | `/api/dissco-cs/site-images`       | GET publiek / PUT admin      |
| `homeStepsController`     | `/api/dissco-cs/home-steps`        | GET publiek / PUT admin      |
| `announcementsController` | `/api/dissco-cs/announcements`     | GET publiek / write admin    |
| `institutionsController`  | `/api/dissco-cs/institutions`      | GET /active publiek / write admin |
| `statsController`         | `/api/dissco-cs/stats`             | Publiek                      |
| `projectsController`      | `/api/dissco-cs/projects`          | Gemengd (zie controller)     |
| `manualsController`       | `/api/dissco-cs/manuals`           | Admin                        |
| `forumController`         | `/api/dissco-cs/forum`             | Ingelogd                     |
| `feedbackController`      | `/api/dissco-cs/feedback`          | Ingelogd / reviewer-gated    |
| `reviewController`        | `/api/dissco-cs/review`            | Ingelogd / reviewer-gated    |
| `tasksController`         | `/api/dissco-cs/tasks`             | Ingelogd (Madoc-proxy)       |
| `iiifController`          | `/api/dissco-cs/iiif`              | Publiek (Madoc-proxy)        |
| `captureModelsController` | `/api/dissco-cs/capture-models`    | Ingelogd (Madoc-proxy)       |

### Backend teststructuur

```
backend/test/
  conventions.test.ts              # Conventiecontroles (via test-support/conventions.ts)
  controllers/
    projects.logic.test.ts         # Pure voortgangs- en beschikbaarheidsberekeningen
  infrastructure/
    describe-error.test.ts
    validate-json.test.ts
    validate-params.test.ts
  madoc-client/
    pagination.test.ts
    path-segment.test.ts
    tasks.logic.test.ts
  madoc-db/
    honour-board.logic.test.ts     # Periodegrenzen (today/week/month/legend)
    swr-cache.test.ts
  repositories/
    mappers.test.ts                # Row → DTO conversies
  shared/
    text.test.ts
```

---

## Frontend — mappenstructuur

```
frontend/src/
  main.tsx              # React-entrypoint, QueryClientProvider (queryClient uit api/query-client.ts)
  App.tsx               # BrowserRouter + alle routes
  dissco-cs-config.ts   # Platformbranding (DoeDat, 4 talen)
  api/
    breadcrumbs.ts      # Navigatie- en API-call-reeksen voor foutrapportage
    cs-client/          # Typed csFetch<T>-wrappers per domein (één bestand per controller)
      request.ts        # csFetch<T>, ApiError, recordBreadcrumb
      client-errors.ts  # reportClientError (gebruikt door QueryClient en ErrorBoundary)
      ...               # (announcements.ts, forum.ts, institutions.ts, enz.)
    error-toast.ts      # Globale toast-state (showError, subscribeToToast — buiten React)
    jwt.ts              # getJwt / getCurrentUser / clearJwt / redirectToExpiredLogin
    madoc-auth/         # Directe Madoc-gateway calls (auth, register, wachtwoord)
    queries/            # TanStack Query queryOptions (keys + queryFn per domein)
    query-client.ts     # QueryClient met globale onError handlers (QueryCache + MutationCache)
    slug.ts             # getSiteSlug() uit URL
    url.ts              # URL-bouwers (getest in test/api/url.test.ts)
  components/
    layout/             # AuthGate, PageGate, Navbar, CsPage, nav-config.ts
    ui/                 # Generieke UI-primitieven (knoppen, modals, markdown, toasts)
    auth/               # TermsModal
    announcements/
    capture-models/     # Annotatieformulier-veldtypes
    forum/
    iiif/               # OpenSeadragon-viewer, PDF-viewer
    institutions/
    manuals/
    projects/           # ProjectCard
    stats/              # StatBanner, HonourBoard-componenten
  hooks/
    use-current-project.ts
    use-current-user.ts
    use-honour-board-periods.ts
    use-nav-items.ts
    use-polling-window.ts
    use-project-progress.ts
    use-route-context.ts
    use-site-honour-board.ts
    use-site-stats.ts
  pages/                # Feature-mappen (één map per route)
  translations/         # i18next JSON-bestanden (nl/en/fr/de)
  types/                # Alleen openseadragon.d.ts — alle domeintypen komen uit shared
  utility/              # Pure hulpfuncties (datum, getal, locale, URN, enz.)
```

### Frontend — componentenhiërarchie (routes)

```
main.tsx
  └── <QueryClientProvider client={queryClient}>
        └── <App />
              └── <BrowserRouter basename="/s/{slug}">
                    └── <ErrorBoundary>
                          ├── Auth-routes (geen gate)
                          │     /login, /register, /forgot-password
                          │     /set-password, /reset-password, /activate-account
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
                          │     /institutions/:slug → <PageGate><InstitutionDetail />
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

### Frontend API-laag (drie lagen)

```
pages / hooks
  └── api/queries/*.ts        ← queryOptions (sleutelstructuur + queryFn)
        └── api/cs-client/*.ts ← typed csFetch<T>-wrappers
              └── api/cs-client/request.ts ← csFetch<T>, ApiError, breadcrumb
                    └── fetch('/api/dissco-cs/...')

Foutafhandeling:
  csFetch ApiError  →  QueryClient.queryCache.onError  →  reportClientError  →  POST /client-errors
  csFetch ApiError  →  QueryClient.mutationCache.onError  →  showError (toast) + reportClientError
  ErrorBoundary     →  reportClientError  →  POST /client-errors

Voor Madoc-gateway calls (auth, claims, tasks, IIIF):
  pages / hooks → api/madoc-auth/*.ts → fetch Madoc-gateway
```

### Frontend teststructuur

```
frontend/test/
  conventions.test.ts         # Conventiecontroles (via test-support/conventions.ts)
  api/
    breadcrumbs.test.ts
    client-errors.test.ts
    jwt.test.ts
    query-client.test.ts
    url.test.ts
  components/
    announcements/
    forum/
    manuals/
    stats/
  pages/
    annotate/
      claim-errors.test.ts
      field-help.test.ts
      form/
      manifest-info.test.ts
    site-management/
    user-dashboard/
  utility/
    annotation-document.test.ts
    back-href.test.ts
    format-date.test.ts
    paging.test.ts
    project-image-url.test.ts
    task-display-name.test.ts
```

---

## Shared — types-organisatie

```
shared/types/
  index.ts                  # Re-exporteert alles
  common.ts                 # MadocInternationalString, SitePageLang, MultilingualText, emailSchema
  announcement.ts           # AnnouncementDto + announcementInputSchema
  client-error.ts           # ClientErrorInput + clientErrorSchema + BreadCrumb
  contact.ts                # contactSubmissionSchema
  feedback.ts               # FeedbackThreadDto, FeedbackMessageDto + input-schema's
  forum.ts                  # ForumTopicDto, ForumReplyDto + input-schema's
  home-step.ts              # HomeStepDto + setHomeStepsSchema
  institution.ts            # InstitutionDto, InstitutionInput + institutionInputSchema
  madoc-auth.ts             # MadocSiteTermsDto, MadocLoginInput, enz.
  madoc-capture-model.ts    # CaptureModel, CaptureModelField, enz.
  madoc-crowdsourcing-task.ts # MadocCrowdsourcingTaskDto, MadocPrepareClaimDto, enz.
  madoc-iiif.ts             # MadocManifestDto, MadocCollectionSummaryDto, enz.
  madoc-project.ts          # MadocProjectDto, MadocProjectConfig, enz.
  manual.ts                 # ManualDto, ManualDetailDto, ManualSummaryDto + schema's
  nav-item.ts               # NavItemDto, NAV_ITEM_KEYS + schema's
  project.ts                # ProjectProgressDto, ProjectDebugDto + link-schema's
  review.ts                 # ReviewTaskDto
  site-image.ts             # SiteImageDto + schema's
  site-theme.ts             # SiteThemeDto, SiteColors + schema's
  stats.ts                  # SiteStatsDto, InstitutionStatsDto, HonourBoardPeriodDto
  text.ts                   # Gedeelde tekst-hulpfuncties
```
