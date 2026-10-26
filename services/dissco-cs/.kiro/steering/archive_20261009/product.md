---
inclusion: manual
---

# Productanalyse — dissco-cs (DoeDat)

> Gegenereerd op basis van de broncode. Beschrijft wat de applicatie functioneel doet, afgeleid uitsluitend van de code.

---

## Wat is dit?

**DoeDat** is een citizen science-platform gebouwd door Plantentuin Meise. Het stelt vrijwilligers in staat om wetenschappelijke collectierecords te transcriberen — primair via IIIF-manifests (digitale afbeeldingen van botanische objecten). Het platform is gebouwd als een uitbreidingslaag bovenop **Madoc**, een bestaand IIIF-annotatie- en taakbeheersysteem. DoeDat levert de aanvullende functionaliteit die Madoc niet biedt: communityfeatures, statistieken, beheer en platformbranding.

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

De frontend van DoeDat wordt in productie als statische bestanden meegebundeld in de Docker-container van de backend en geserveerd onder `/cs-assets/*`. De SPA zelf wordt geserveerd op `/s/{slug}/*`, hetzelfde pad-prefix als Madoc.

---

## Gebruikersrollen

| Rol              | Toegang                                                                      |
|------------------|------------------------------------------------------------------------------|
| **Bezoeker**     | Homepage, projectenlijst, projectdetail, instellingen, statistieken, honour board |
| **Vrijwilliger** | Alles van bezoeker + annoteren, eigen dashboard, forum, review-feedback lezen |
| **Reviewer**     | Alles van vrijwilliger + reviewtaken-overzicht, feedback sturen naar vrijwilligers |
| **Admin**        | Alles + volledig sitebeheer (zie beheerportaal)                              |

Authenticatie en gebruikersbeheer worden volledig gedelegeerd aan Madoc. Rollen worden gelezen uit het JWT-token (`site.admin` scope) of via een Madoc-gateway-call (`getMadocSiteUserRole`).

---

## Kernfunctionaliteit

### 1. Annoteren van IIIF-manifests
Vrijwilligers openen een manifest en vullen een gestructureerd annotatieformulier in. De annotatieinterface bestaat uit:
- een **OpenSeadragon-viewer** voor het bekijken van de afbeelding (IIIF Image API)
- ondersteuning voor **PDF-manifests** via pdfjs-dist
- een **CaptureModelForm** op basis van Madoc's capture model — ondersteunde veldtypes: tekst (enkelvoudig en meerregelig), dropdown, checkboxlijst en autocomplete (externe databron)

De annotatie-lifecycle (claim aanmaken, herzien, indienen, intrekken) wordt volledig via de Madoc-gateway afgehandeld. De CS-backend levert één aanvullend eindpunt: het herberekenen van de manifest-teller na een abandon (`POST /:projectId/manifests/:manifestId/resync-claim`), dat een bekende Madoc-bug verhelpt waarbij manifests permanent geblokkeerd bleven bij `maxContributors:1`.

### 2. Projectenoverzicht en voortgang
- De **projectenlijst** (`/explore`) toont actieve en gepubliceerde projecten. Projecten worden opgehaald via de Madoc-gateway en doorgegeven door de CS-backend.
- Elke **projectdetailpagina** toont voortgangsstatistieken berekend door de CS-backend: percentage getranscribeerd, totale en beschikbare manifests, per-manifest beschikbaarheid op basis van contributor-limieten en inzendingsstatus.
- De voortgangsberekening houdt rekening met twee redenen waarom een manifest niet meer beschikbaar is: (1) al ingediend/geaccepteerd, (2) contributor-maximum bereikt.

### 3. Instellingen (institutions)
- Overzichtspagina (`/institutions`) en detailpagina per instelling.
- Elke instelling heeft: meertalige naam en beschrijving, contactgegevens (e-mail, telefoon, website), logo (opgeslagen als data-URI in de database) en een koppeling aan één of meer Madoc-projecten.
- Per instelling zijn aparte statistieken en een eigen honour board beschikbaar.

### 4. Statistieken (sitebreed en per instelling)
Een banner op meerdere pagina's toont live:
- **Aantal actieve vrijwilligers** — telt actieve, niet-geautomatiseerde gebruikers met een sitepermissie (`madoc_ts.user` + `site_permission`)
- **Aantal voltooide taken** — telt unieke (root_task, subject)-combinaties met status 2 of 3 (`tasks_api.tasks`)
- **Totaal aantal taken** — telt manifests via Madoc's `iiif_derived_resource_items`

Per instelling telt "vrijwilligers" anders: elke distinct assignee met minstens één voltooide taak op die instelling's projecten — een bewuste keuze gedocumenteerd in `stats.repository.ts`.

Alle statistieken worden gecached met stale-while-revalidate. Polling-endpoints (`/current`) lezen uitsluitend de cache zonder een recompute te triggeren.

### 5. Honour Board (leaderboard)
Top-3 vrijwilligers en de rangschikking van de ingelogde gebruiker, uitgesplitst in vier periodes: **vandaag**, **deze week** (ma–zo), **deze maand**, **legende** (all-time).

De telling vermijdt een subtiel periodiseringsprobleem: een reviewer die een oude inzending goedkeurt, zou anders de `modified_at`-timestamp van de taak in de huidige periode plaatsen en de bijdrage aan de verkeerde vrijwilliger toeschrijven. Status-3-taken worden daarom geteld op `created_at`, status-2-taken op `modified_at`.

Beschikbaar zowel sitebreed als per instelling (gefilterd op de `root_task`-IDs van die instelling's projecten). Gecached per scope+periode.

### 6. Navigatie-items en paginabeheer
Pagina's zoals "Over", "Help", "Instellingen", "Contact" en "Forum" zijn instelbaar per Madoc-site:
- **activeren/deactiveren** — deactieve pagina's verdwijnen uit de navigatie en geven een redirect naar `/`
- **meertalige inhoud** — Markdown per taal (NL/EN/FR/DE), opgeslagen als JSONB
- **volgorde** — via drag-and-drop in het beheerportaal
- **contactformulier** — apart in/uitschakelbaar, eigen e-mailadres

`use-nav-items` in de frontend en `PageGate` zorgen voor fail-open gedrag: bij een laadstoring zijn alle pagina's zichtbaar.

### 7. Forum (berichtenbord)
Geauthenticeerde gebruikers kunnen discussietopics aanmaken en beantwoorden (`/forum`). Features:
- Topics aanmaken met optionele koppeling aan een project (slug + label) en taak-URL
- Replies plaatsen
- Ongelezen-indicatie per topic (bijgehouden in `forum_read_state`)
- Topics en replies sluiten of verwijderen (door auteur of admin)
- Topics kunnen worden gesloten zodat nieuwe replies geblokkeerd worden

### 8. Reviewtaken-overzicht
Reviewers en admins (`/review`) zien een overzicht van alle crowdsourcing-taken die ter beoordeling staan, samengesteld door de CS-backend uit de Madoc-gateway. Per taak zijn zichtbaar: project, subject (manifest), indiener en reviewer. Reviewers kunnen de annotatieinhoud inline uitklappen voor beoordeling. Goedkeuren/afwijzen verloopt via Madoc's eigen crowdsourcing-taakroute (bewust niet de generieke tasks-API PATCH).

### 9. Review-feedback (privéberichten)
Na een review kan een reviewer privé feedback sturen naar de vrijwilliger (`/feedback/threads`). Features:
- Reviewer maakt een thread aan met onderwerp en eerste bericht
- Beide partijen kunnen antwoorden
- Threads kunnen worden verborgen door zowel reviewer als ontvanger (soft delete per partij)
- Ongelezen-teller per thread, bijgewerkt bij elke weergave

### 10. Aankondigingen
Admins maken meertalige aankondigingen die zichtbaar zijn op:
- de homepage (target `homepage`)
- de projectenlijst (target `projects`)
- een specifieke projectpagina (target `project` + `targetProjectSlug`)

Aankondigingen hebben een optionele start- en einddatum. Start/einde worden cross-gevalideerd in het Zod-schema. Datum-only einddatums worden automatisch omgezet naar `23:59:59.999` van die dag.

### 11. Contactformulier
Een contactformulier (`/contact`) stuurt een e-mail naar het geconfigureerde adres. Beveiligd met een honeypot-veld en een in-memory sliding-window rate limiter (5 pogingen per 10 minuten per IP per site). Het contactadres en het tonen van het formulier zijn instelbaar via de nav-item-instellingen.

### 12. Projecthandleidingen
Admins koppelen per project een handleiding (`/manuals`). Een handleiding heeft:
- meertalige titel en inhoud (Markdown, max 200.000 tekens)
- optionele bestandsbijlage per taal (opgeslagen als BYTEA, max 8 MB)

Vrijwilligers zien de handleiding als modal op de projectpagina. Bijlagen zijn downloadbaar als bestand (Content-Disposition: attachment).

### 13. Gebruikersdashboard
Ingelogde vrijwilligers (`/my-dashboard`) zien:
- hun eigen actieve taken (alle pagina's opgehaald via Madoc-gateway, gebundeld aan de client)
- voltooide taken
- onbeantwoorde forumtopics (max 3, voor community-betrokkenheid)
- ontvangen review-feedback-threads
- kunnen taken loslaten (abandon) direct vanuit het dashboard

### 14. Beheerportaal (`/manage`)
Centrale admintool met de volgende subpagina's:

| Subpagina                 | Functie                                                                      |
|---------------------------|------------------------------------------------------------------------------|
| `/manage`                 | Dashboard met alle beheergebieden                                            |
| `/manage/projects`        | Projectbeheer: handleiding- en instellingskoppelingen, bulk aanmaken, stuck tasks, task-debug |
| `/manage/announcements`   | Aankondigingen beheren                                                       |
| `/manage/users`           | Gebruikersoverzicht via Madoc-gateway                                        |
| `/manage/pages`           | Nav-items activeren, inhoud bewerken, volgorde instellen                     |
| `/manage/institutions`    | Instellingen aanmaken, bewerken, koppelen aan projecten                      |

### 15. Stuck tasks-beheer
Manifests die vastzitten (claim niet losgelaten, niet ingediend) zijn via het beheerportaal zichtbaar en los te laten. Admins zien hoelang een taak al vaststaat. Na loslaten wordt de manifest-teller herberekend via hetzelfde `resync-claim`-eindpunt als bij een vrijwilligers-abandon.

### 16. Task-debug-overzicht
Admin-only debugview: per manifest van een project wordt getoond welke crowdsourcing-taken eraan hangen en of ze meetellen als "getranscribeerd" (status 2 of 3) — zodat het voortgangspercentage op de projectpagina visueel controleerbaar is zonder de database te raadplegen.

### 17. Bulk project aanmaken
Admins kunnen meerdere Madoc-projecten aanmaken op basis van bestaande collecties (elk manifest wordt een afzonderlijk project). Elk project doorloopt Madoc's eigen aanmaakriflow (collection + capture model + root task). Het aanmaken wordt bewust geserialiseerd om overbelasting van de gateway te voorkomen.

### 18. Zoekfunctie
Een zoekpagina (`/find`) delegeert aan Madoc's eigen zoekmechanisme, doorgestuurd via de CS-backend als de ingelogde gebruiker.
