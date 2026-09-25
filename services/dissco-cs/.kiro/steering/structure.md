---
inclusion: manual
---

# Projectstructuur — dissco-cs

> Baseline-document gegenereerd op basis van codebase-analyse. Beschrijft de mappenstructuur en componentenhiërarchie zoals aangetroffen in de code. Pas dit document aan zodra de structuur wijzigt.

---

## Monorepo-indeling

```
dissco-cs/
├── api/                    # Node.js REST-API (Hono)
│   ├── src/
│   │   ├── app.ts          # App-factory: registreert alle routes
│   │   ├── config.ts       # Omgevingsvariabelen (typed + gevalideerd)
│   │   ├── db.ts           # DisscoCSRepository: centrale DB-klasse + migraties
│   │   ├── index.ts        # Entrypoint: start Hono server
│   │   ├── jwt.ts          # JWT-parsing, identiteitsresolutie, site-id-resolutie
│   │   ├── mailer.ts       # Nodemailer singleton
│   │   ├── rate-limit.ts   # In-memory rate limiter
│   │   ├── validators.ts   # Input-validatiehulpfuncties
│   │   ├── madoc-client/   # HTTP-client richting Madoc-gateway (service JWT)
│   │   ├── repositories/   # Datalaag per domein
│   │   └── routes/         # Route-handlers per domein
│   ├── scripts/            # SQL seed-bestanden (instellingen, projecten, taken, gebruikers)
│   └── package.json
│
├── frontend/               # React SPA (Vite)
│   ├── src/
│   │   ├── main.tsx        # React-entrypoint
│   │   ├── App.tsx         # BrowserRouter + alle routes
│   │   ├── dissco-cs-config.ts   # Platform-branding (DoeDat, 4 talen)
│   │   ├── site-pages-nav-config.ts
│   │   ├── api/            # HTTP-clients (cs-api.ts + madoc-client/)
│   │   ├── components/     # Gedeelde UI-componenten
│   │   ├── contexts/       # React Context (SitePagesContext)
│   │   ├── hooks/          # Custom data-hooks (react-query wrappers)
│   │   ├── pages/          # Feature-pagina's (één map per route)
│   │   ├── types/          # Gedeelde TypeScript-typen
│   │   └── utility/        # Pure hulpfuncties (formatteren, parsing)
│   └── package.json
│
├── docs/                   # Projectdocumentatie (Markdown)
└── Dockerfile
```

---

## API — Lagen en verantwoordelijkheden

```
index.ts
  └── createDisscoCSApp()  (app.ts)
        ├── routes/*          ← HTTP-laag: validatie, JWT-check, response
        │     └── gebruikt:
        │           ├── DisscoCSRepository  (eigen schema)
        │           ├── HonourBoardRepository
        │           ├── MadocUsersRepository
        │           ├── SiteTaskTotalsRepository
        │           ├── InstitutionStatsRepository
        │           └── madoc-client/*  (Madoc-gateway HTTP calls)
        └── static-serving    ← frontend-dist/ (alleen in Docker)
```

### API routes overzicht

| Route-prefix                         | Bestand                         | Auth vereist  |
|--------------------------------------|---------------------------------|---------------|
| `/api/dissco-cs/forum`               | forum.routes.ts                 | Gedeeltelijk  |
| `/api/dissco-cs/site-pages`          | site-pages.routes.ts            | Admin         |
| `/api/dissco-cs/contact`             | contact.routes.ts               | Nee           |
| `/api/dissco-cs/announcements`       | announcements.routes.ts         | Admin (write) |
| `/api/dissco-cs/institutions`        | institutions.routes.ts          | Admin (write) |
| `/api/dissco-cs/stats`               | stats.routes.ts                 | Nee           |
| `/api/dissco-cs/honour-board`        | honour-board.routes.ts          | Nee           |
| `/api/dissco-cs/projects/:id/progress` | project-progress.routes.ts    | Nee           |
| `/api/dissco-cs/projects` (claims)   | manifest-claim.routes.ts        | Ingelogd      |
| `/api/dissco-cs/projects` (stuck)    | stuck-tasks.routes.ts           | Admin         |
| `/api/dissco-cs/projects` (debug)    | project-debug.routes.ts         | Admin         |
| `/api/dissco-cs/review`              | review.routes.ts                | Reviewer/Admin|
| `/api/dissco-cs/review-feedback`     | review-feedback.routes.ts       | Ingelogd      |
| `/api/dissco-cs` (manuals)           | project-manuals.routes.ts       | Gedeeltelijk  |

### API repositories overzicht

| Repository                    | Schema           | Verbindingstype |
|-------------------------------|------------------|-----------------|
| `DisscoCSRepository`          | `dissco_cs`      | Eigen user      |
| `HonourBoardRepository`       | `tasks_api`      | Readonly reuse  |
| `MadocUsersRepository`        | `madoc_ts`       | Readonly reuse  |
| `SiteTaskTotalsRepository`    | `madoc_ts` + `tasks_api` | Beide readonly |
| `InstitutionStatsRepository`  | `tasks_api`      | Readonly reuse  |

### DisscoCSRepository — interne sub-repositories

```
DisscoCSRepository (db.ts)
  ├── .forum          → ForumRepository
  ├── .sitePages      → SitePagesRepository
  ├── .announcements  → AnnouncementsRepository
  ├── .institutions   → InstitutionsRepository
  ├── .projectManuals → ProjectManualsRepository
  └── .reviewFeedback → ReviewFeedbackRepository
```

### Databaseschema — tabellen (eigen dissco_cs schema)

```
forum_topics
forum_replies
forum_read_state
site_pages
announcements
institutions
project_institution_links
project_manuals
project_manual_links
project_manual_attachments   (BYTEA — bestanden in DB opgeslagen)
review_feedback_threads
review_feedback_messages
```

---

## Frontend — Componentenhiërarchie

```
main.tsx
  └── <App />
        └── <BrowserRouter basename="/s/{slug}">
              └── <SitePagesProvider>   ← Context: actieve pagina's, inhoud, taal
                    ├── Openbare routes (geen auth)
                    │     ├── /              → <Homepage />
                    │     ├── /explore       → <Projects />
                    │     ├── /explore/:slug → <ProjectDetail />
                    │     ├── /honour-board  → <HonourBoard />
                    │     ├── /find          → <SearchResults />
                    │     ├── /login         → <Login />
                    │     ├── /register      → <Register />
                    │     ├── /forgot-password → <ForgotPassword />
                    │     └── /set-password / /reset-password / /activate-account → <SetPassword />
                    │
                    ├── PageGate-routes (admin kan pagina deactiveren)
                    │     ├── /about         → <PageGate pageKey="about"><About /></PageGate>
                    │     ├── /help          → <PageGate pageKey="help"><Help /></PageGate>
                    │     ├── /institutions  → <PageGate><Institutions /></PageGate>
                    │     ├── /institutions/:slug → <PageGate><InstitutionDetail /></PageGate>
                    │     └── /contact       → <PageGate><Contact /></PageGate>
                    │
                    ├── AuthGate-routes (vereist inloggen)
                    │     ├── /messageboard  → <PageGate><AuthGate><MessageBoard /></AuthGate></PageGate>
                    │     ├── /my-dashboard  → <AuthGate><UserDashboard /></AuthGate>
                    │     └── /explore/:slug/manifests/:id/annotate → <AuthGate><AnnotatePage /></AuthGate>
                    │
                    ├── Reviewer-routes
                    │     └── /review        → <AuthGate requireReviewer><ReviewTasks /></AuthGate>
                    │
                    └── Admin-routes
                          ├── /manage        → <AuthGate requireAdmin><SiteManagement /></AuthGate>
                          ├── /manage/projects      → <ProjectManagement />
                          ├── /manage/announcements → <Announcements />
                          ├── /manage/users         → <UserManagement />
                          ├── /manage/pages         → <PageManagement />
                          └── /manage/institutions  → <InstitutionManagement />
```

### Gedeelde components

```
components/
  ├── Toegangscontrole
  │     ├── AuthGate.tsx          — redirect naar /login of / op basis van rol
  │     └── PageGate.tsx          — verbergt route als admin pagina deactiveerde
  │
  ├── Layout & navigatie
  │     ├── navbar/Navbar.tsx
  │     └── CsPage.tsx            — paginawrapper (titelbeheer)
  │
  ├── Formulierelementen
  │     ├── SaveButton.tsx / CancelButton.tsx / DeleteIconButton.tsx
  │     ├── ToggleSwitch.tsx / ActiveStatusToggle.tsx / ActiveToggleField.tsx
  │     ├── Select.tsx
  │     ├── ReviewFieldForm.tsx
  │     └── MarkdownToolbar.tsx
  │
  ├── Content-display
  │     ├── CsMarkdown.tsx        — react-markdown wrapper
  │     ├── LocaleString.tsx      — meertalige tekstweergave
  │     ├── StatBanner.tsx        — sitestatistieken banner
  │     ├── TaskTable.tsx
  │     └── TaskRevisionView.tsx
  │
  ├── Modals & dialogen
  │     ├── Modal.tsx
  │     ├── ConfirmDialog.tsx
  │     ├── WelcomeModal.tsx
  │     ├── TermsModal.tsx
  │     ├── ProjectManualModal.tsx
  │     └── ImagePreviewPopup.tsx
  │
  ├── Domein-specifiek
  │     ├── announcements/AnnouncementBanner.tsx
  │     ├── honour-board/HonourBoardSpotlight.tsx
  │     ├── honour-board/PeriodCard.tsx
  │     ├── institutioncard/
  │     ├── projectcard/ProjectCard.tsx
  │     └── messageform/
```

### Frontend pages — interne structuur (voorbeelden)

```
pages/annotate/
  ├── AnnotateLayout.tsx
  ├── AnnotatePage.tsx
  ├── form/
  │     ├── CaptureModelForm.tsx
  │     ├── document.ts
  │     └── fields/
  └── viewer/
        └── OpenSeadragonViewer.tsx

pages/review/
  ├── ReviewTasks.tsx           — hoofdpagina
  ├── ReviewTable.tsx
  ├── ReviewInlineExpansion.tsx
  ├── ReviewFeedbackModal.tsx
  ├── ReviewCountSummary.tsx
  ├── ReviewSearchInput.tsx
  ├── useReviewTasksController.ts
  └── useReviewRevisionDocument.ts

pages/site-management/
  ├── SiteManagement.tsx        — dashboard-ingang
  ├── ProjectManagement.tsx
  ├── Announcements.tsx
  ├── UserManagement.tsx
  ├── PageManagement.tsx
  ├── InstitutionManagement.tsx
  └── project-management/
        ├── ProjectsSubview.tsx
        ├── ManualsSubview.tsx
        ├── ManualContentEditor.tsx
        ├── StuckTasksSubview.tsx
        ├── TaskDebugSubview.tsx
        └── BulkCreateProjectsSubview.tsx
```

### Frontend API-laag

```
src/api/
  ├── cs-api.ts            — 12 API-objecten, elk met typed csFetch-calls
  │     forumApi · sitePagesApi · projectProgressApi · manifestClaimApi
  │     projectDebugApi · stuckTasksApi · reviewApi · reviewFeedbackApi
  │     contactApi · announcementsApi · statsApi · honourBoardApi
  │     institutionsApi · projectManualsApi
  ├── jwt.ts               — getJwt() / getCurrentUser() / clearJwt()
  ├── slug.ts              — getSiteSlug() uit URL
  └── madoc-client/        — directe Madoc-gateway calls (auth, projects, tasks…)
        auth.ts · collections.ts · crowdsourcing.ts
        projects.ts · request.ts · tasks.ts · user.ts
```

### Frontend hooks

```
hooks/
  use-current-user.ts          → getCurrentUser() (sync, uit JWT cookie)
  use-project-list.ts          → react-query: lijst van projecten
  use-project.ts               → react-query: één project
  use-project-progress.ts      → react-query: voortgangsstats
  use-site-stats.ts            → react-query: site-brede stats + polling
  use-honour-board.ts          → react-query: leaderboard + polling
  use-institution-honour-board.ts
  use-institution-stats.ts
  use-search.ts                → react-query: zoekresultaten
  use-dissco-cs-navigation.ts  → navigatiehulpfunctie
  use-route-context.ts
  use-auto-select-first-slug.ts
  use-grid-column-count.ts
  use-polling-window.ts        → polling-interval op basis van zichtbaarheid
```
