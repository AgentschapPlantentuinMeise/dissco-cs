---
inclusion: manual
---

# Productanalyse — dissco-cs (DoeDat)

> Gegenereerd op basis van de broncode. Beschrijft wat de applicatie functioneel doet.

---

## Wat is dit?

**DoeDat** is een citizen science-platform gebouwd door Plantentuin Meise. Het stelt vrijwilligers in staat om wetenschappelijke collectierecords te transcriberen — primair via IIIF-manifests (digitale afbeeldingen van botanische objecten). Het platform is een uitbreidingslaag bovenop **Madoc**, een bestaand IIIF-annotatie- en taakbeheersysteem. DoeDat levert de communityfeatures, statistieken, brandingconfiguratie en beheerfunctionaliteit die Madoc niet biedt.

De applicatie is meertalig (NL, EN, FR, DE) en wordt per Madoc-site-instantie gedeployed.

---

## Architecturele positie

```
Browser
  ├── /s/{slug}/*          → Madoc (eigen React-frontend + Koa-backend)
  ├── /api/madoc/*         → Madoc API-gateway
  ├── /api/tasks/*         → tasks-API (gateway)
  └── /api/dissco-cs/*    → DiSSCo CS backend (Hono) ← dit project

DiSSCo CS backend
  ├── Eigen PostgreSQL-schema      (dissco_cs)
  ├── Readonly: madoc_ts-schema    (vrijwilligersaantallen, projectmetadata)
  ├── Readonly: tasks_api-schema   (taakaantallen, honour board)
  └── HTTP-calls: Madoc-gateway    (service JWT voor serverberekeningen,
                                    user JWT voor gebruikersacties)
```

---

## Gebruikersrollen

| Rol              | Toegang                                                                       |
|------------------|-------------------------------------------------------------------------------|
| **Bezoeker**     | Homepage, projectenlijst, projectdetail, instellingen, statistieken, honour board |
| **Vrijwilliger** | Alles van bezoeker + annoteren, eigen dashboard, forum, review-feedback lezen |
| **Reviewer**     | Alles van vrijwilliger + reviewtaken-overzicht, feedback sturen               |
| **Admin**        | Alles + volledig sitebeheer                                                   |

Authenticatie en gebruikersbeheer worden volledig gedelegeerd aan Madoc. Rollen komen uit het JWT-token (`site.admin` scope) of via een Madoc-gateway-call (`getMadocSiteUserRole`).

---

## Kernfunctionaliteit

### 1. Annoteren van IIIF-manifests
Vrijwilligers openen een manifest en vullen een gestructureerd annotatieformulier in. De annotatieinterface bestaat uit:
- een **OpenSeadragon-viewer** (IIIF Image API, met tile-level zoom)
- **PDF-ondersteuning** via pdfjs-dist
- een **CaptureModelForm** op basis van Madoc's capture model, met veldtypes: tekst (enkelvoudig en meerregelig), dropdown, checkboxlijst en autocomplete (externe databron via `dataSource`-URL)

De annotatie-lifecycle (claim aanmaken, herzien, indienen, intrekken) gaat via de Madoc-gateway. De CS-backend levert één aanvullend eindpunt: herberekening van de manifest-teller na een abandon (`resync-claim`), als correctie op een Madoc-bug waarbij manifests bij `maxContributors:1` permanent geblokkeerd bleven.

### 2. Projectenoverzicht en voortgang
- De **projectenlijst** (`/explore`) toont gepubliceerde projecten, opgehaald via de Madoc-gateway en doorgegeven door de CS-backend.
- Elke **projectdetailpagina** toont voortgangsstatistieken: percentage getranscribeerd, per-manifest beschikbaarheid op basis van contributor-limieten en inzendingsstatus, en thumbnails per manifest.
- De voortgangsberekening houdt rekening met `claimGranularity` (canvas vs. manifest) en `contributionMode` (transcription vs. default).

### 3. Instellingen (institutions)
- Overzichtspagina en detailpagina per instelling.
- Elke instelling heeft: meertalige naam en beschrijving, contactgegevens, logo (data-URI, max 3 MB), en een koppeling aan één of meer Madoc-projecten.
- Per instelling zijn aparte statistieken en een eigen honour board beschikbaar.

### 4. Site-themabeheer
Admins kunnen de **brandingkleuren** (vijf CSS-variabelen: primary, secondary, accent, dark, tertiary) en de **sitenaam** instellen via het beheerportaal. Lege waarden zetten de defaults van het platform terug. De kleuren worden opgeslagen als `#rrggbb`-strings en direct als CSS-variabelen door de frontend toegepast.

### 5. Site-afbeeldingen
Admins kunnen vaste afbeeldingen instellen per sleutel (hero, logo, enz.). Elke afbeelding wordt opgeslagen als data-URI in de database.

### 6. Statistieken (sitebreed en per instelling)
Een banner toont live:
- **Aantal actieve vrijwilligers** — actieve, niet-geautomatiseerde gebruikers met sitepermissie (`madoc_ts`)
- **Aantal voltooide taken** — unieke (root_task, subject)-combinaties met status 2 of 3 (`tasks_api`)
- **Totaal aantal taken** — manifests via Madoc's `iiif_derived_resource_items`

Per instelling telt "vrijwilligers" anders: distinct assignees met minstens één voltooide taak op die instelling's projecten — een bewuste keuze.

Alle statistieken worden gecached met stale-while-revalidate. Polling-endpoints (`/current`) lezen uitsluitend de cache zonder een recompute te triggeren.

### 7. Honour Board (leaderboard)
Top-3 vrijwilligers en de rangschikking van de ingelogde gebruiker, in vier periodes: **vandaag**, **deze week** (ma–zo), **deze maand**, **legende** (all-time).

Status-3-taken (goedgekeurd) worden geteld op `created_at` (om mis-attributie door late reviewgoed­keuring te voorkomen); status-2-taken op `modified_at`. Beschikbaar sitebreed en per instelling. Gecached per scope+periode.

### 8. Navigatie-items en paginabeheer
Pagina's (About, Help, Instellingen, Contact, Forum, Welcome) zijn instelbaar per site:
- **activeren/deactiveren** — deactieve pagina's verdwijnen uit de navigatie
- **meertalige inhoud** (Markdown per taal, JSONB)
- **volgorde** (drag-and-drop in beheerportaal)
- **contactformulier** — apart in/uitschakelbaar met eigen e-mailadres

### 9. "How it works" stappen op de homepage
Admins kunnen tot vier meertalige uitlegstapjes instellen die op de homepage worden getoond. Een lege lijst verbergt de sectie. Elke stap heeft een titel (max 80 tekens) en een omschrijving (max 300 tekens) per taal.

### 10. Forum (berichtenbord)
Geauthenticeerde gebruikers (`/forum`):
- Topics aanmaken, optioneel gekoppeld aan een project
- Replies plaatsen
- Ongelezen-indicatie per topic (`forum_read_state`)
- Topics en replies sluiten of verwijderen (door auteur of admin)

### 11. Reviewtaken-overzicht
Reviewers en admins (`/review`) zien alle crowdsourcing-taken ter beoordeling. Reviewers kunnen annotatieinhoud inline uitklappen. Goedkeuren/afwijzen gaat via Madoc's eigen crowdsourcing-taakroute.

### 12. Review-feedback (privéberichten)
Reviewers sturen privé feedback naar vrijwilligers (`/feedback/threads`). Beide partijen kunnen antwoorden. Threads zijn per partij verbergbaar (soft delete); als beide partijen verbergen volgt een echte DELETE.

### 13. Aankondigingen
Meertalige banners, zichtbaar sitebreed, op de projectenlijst of op een specifiek project. Optionele start- en einddatum (kruisgevalideerd in Zod-schema). Datum-only einddatums worden omgezet naar `23:59:59.999`.

### 14. Contactformulier
Stuurt e-mail naar het geconfigureerde adres. Beveiligd met een honeypot-veld (`website`) en een in-memory rate limiter (5 per 10 minuten per IP per site).

### 15. Projecthandleidingen
Admins koppelen per project een handleiding. Een handleiding heeft meertalige titel (max 200 tekens) en inhoud (Markdown, max 200.000 tekens), plus optionele bestandsbijlagen per taal (BYTEA in DB, max 8 MB). Vrijwilligers zien de handleiding als modal op de projectpagina.

### 16. Gebruikersdashboard
Ingelogde vrijwilligers (`/my-dashboard`) zien hun eigen actieve en voltooide taken, onbeantwoorde forumtopics, en ontvangen review-feedback-threads. Taken kunnen direct worden losgelaten (abandon) vanuit het dashboard.

### 17. Beheerportaal (`/manage`)

| Subpagina                 | Functie                                                                        |
|---------------------------|--------------------------------------------------------------------------------|
| `/manage`                 | Dashboard met alle beheergebieden                                              |
| `/manage/projects`        | Handleiding- en instellingskoppelingen, bulk aanmaken, stuck tasks, task-debug |
| `/manage/announcements`   | Aankondigingen aanmaken, bewerken, verwijderen                                 |
| `/manage/users`           | Gebruikersoverzicht via Madoc-gateway                                          |
| `/manage/pages`           | Nav-items activeren, inhoud bewerken, volgorde instellen, homepage-stappen     |
| `/manage/institutions`    | Instellingen aanmaken, bewerken, koppelen aan projecten                        |

### 18. Stuck tasks-beheer
Manifests die vastzitten (claim niet losgelaten, niet ingediend) zijn zichtbaar en los te laten. Na loslaten wordt de manifest-teller herberekend via hetzelfde `resync-claim`-eindpunt als bij een vrijwilligers-abandon.

### 19. Task-debug-overzicht
Admin-only view: per manifest van een project wordt getoond welke crowdsourcing-taken eraan hangen en of ze meetellen als "getranscribeerd" — zodat het voortgangspercentage visueel controleerbaar is.

### 20. Bulk project aanmaken
Admins maken meerdere Madoc-projecten aan op basis van bestaande collecties (elk manifest wordt een apart project). Aanmaken is geserialiseerd om overbelasting van de gateway te voorkomen.

### 21. Zoekfunctie
`/find` delegeert aan Madoc's eigen zoekmechanisme, doorgestuurd als de ingelogde gebruiker.

### 22. Frontend crash-rapportage
Elke render-crash (ErrorBoundary), mislukte server-call (react-query) en mislukte actie (upload, claim, enz.) wordt gerapporteerd naar `POST /api/dissco-cs/client-errors` en opgeslagen in de `app_log`-tabel. Breadcrumbs (laatste route- en API-wijzigingen) worden meegestuurd voor context.
