# Overzicht bewaarde plannen (dissco-cs)

Verzameling van alle plannen die in eerdere sessies zijn uitgewerkt voor dit project,
zodat toekomstig werk niet opnieuw hoeft te ontdekken wat al onderzocht/beslist is. Dit
document is een **samenvatting**, geen vervanging van de volledige plannen (die leven
lokaal in Claude's plan-geschiedenis, niet in deze repo). Bedoeld als naslagwerk, naar
het patroon van `MANIFEST-CLAIMS.md`/`USER-DASHBOARD.md` in deze map.

**Belangrijk over status:** waar een plan zelf expliciet een status vermeldde
("uitgevoerd", "geparkeerd", "gepland"), is die hier overgenomen. Waar dat niet het
geval was, staat dat hieronder expliciet vermeld ("uitvoeringsstatus onbekend") in
plaats van aangenomen — controleer in dat geval de huidige code/git-historiek voor je
op dit plan verder bouwt.

## Statusoverzicht

| Onderwerp | Status |
|---|---|
| Architectuur: eigen backend + databank (`services/citizen-science` → `services/dissco-cs`) | Uitgevoerd |
| Refactoring & hernoeming naar `dissco-cs` | Deel 1 (backend-fixes) uitgevoerd; Deel 2 (route-splitsing) en Deel 3 (hernoeming) — zie opmerking hieronder, hernoeming lijkt intussen doorgevoerd |
| Checklist: overzetten naar verse upstream fork | Referentiedocument, geen "uitvoeren/niet uitvoeren"-status |
| Eigen taken/annotatie-scherm (`AnnotatePage`) | Fase 1 uitgevoerd; Fase 2 (resterende veldtypes, polygon-selector) gepland |
| Compacte specimen-metadata + IIIF drag-icon | Uitvoeringsstatus onbekend |
| Manifest-zichtbaarheid/claim-fixes (oude, ingebedde madoc-ts-editor) | Vermoedelijk **vervallen** — sloeg op de oude architectuur vóór de migratie naar `services/dissco-cs`, zie opmerking hieronder |
| Eigen statistieken-laag (voortgang, honour board) | Uitvoeringsstatus onbekend |
| Stats-widget op homepage (vrijwilligers/voltooid) | Geparkeerd — vermoedelijk **ingehaald** door de statistieken-laag hierboven |
| Site management: pagina's aan/uit + content (about/help/instituten) | Uitvoeringsstatus onbekend |
| Welkomstbericht nieuwe gebruikers | Plan volledig uitgewerkt, bouwt voort op site-pages-systeem hierboven |
| Meldingen-systeem (announcements) homepage/projecten | Uitvoeringsstatus onbekend; ontworpen vóór de migratie naar `services/dissco-cs`, paden moeten herbekeken worden |
| Leesstatus message board (forum) | Uitvoeringsstatus onbekend |
| Talen-configuratie centraliseren | Geparkeerd — vermoedelijk **ingehaald** door het databank-gedreven talen-plan hieronder |
| Databank-gedreven talen (volledige i18n via DB) | Volledig uitgewerkt plan, uitvoeringsstatus onbekend |
| Eigen auth-formulieren (login/register/wachtwoord) | Plan volledig uitgewerkt |
| Stappenplan: testversie naar dev-server | Referentie-draaiboek, door de gebruiker zelf uit te voeren |
| Gateway wachten op madoc-ts (lokale dev-ervaring) | Voorgesteld, uitvoeringsstatus onbekend |
| Automatisch vrijgeven van vastzittende "bewaarde" taken | **Huidig, geparkeerd** — zie eigen sectie onderaan |

**Let op — mogelijke architectuurbreuk in oudere plannen:** een aantal vroege plannen
(manifest-zichtbaarheid, diagnostische logging, meldingen-systeem) beschrijven nog de
**oude, ingebedde** citizen-science-code binnen `services/madoc-ts/src/frontend/site/
citizen-science/`. Latere plannen documenteren expliciet dat deze volledig is losgekoppeld
naar een zelfstandige dienst (`services/citizen-science` → uiteindelijk hernoemd naar
`services/dissco-cs`, huidige structuur bevestigd: `services/dissco-cs/{api,frontend}`).
Bevindingen/oplossingen uit die oudere plannen zijn dus niet zomaar herbruikbaar op de
huidige codebase zonder eerst te controleren of het beschreven bestand/pad nog bestaat.

---

## Architectuur & infrastructuur

### Eigen backend + databank zonder upstream Madoc te raken
**Status: uitgevoerd** (bevestigd door de huidige mapstructuur `services/dissco-cs/{api,frontend}`).
Besluit: de citizen-science-frontend blijft (was toen nog) diep verweven met Madoc's
site-shell, maar een **nieuwe, losse dienst** met eigen Hono-server + eigen Postgres-schema
(naar het precedent van `services/config-service`) is haalbaar zonder een upstream madoc-ts
bestand te wijzigen — koppeling met Madoc-data via het bestaande service-JWT-mechanisme
(`sync-jwt-requests.ts`/`generate-service-token.ts`, zelfde patroon als tasks-api/models-api).
Later heroverwogen en uitgebreid: ook de **frontend** zelf kon losgekoppeld worden (niet
alleen de backend), inclusief een eigen, sterk vereenvoudigde annotatie-viewer/formulier
(zie "Eigen taken/annotatie-scherm" hieronder) i.p.v. Madoc's generieke 396-bestanden
capture-model-editor — onderbouwd met de concrete velden van het "herbarium-sheets-project"
(~15 velden, 3 veldtypes). Bevat ook een concreet nginx-serving-plan (regex-locations vóór
de catch-all) en een beveiligingsanalyse (auth/JWT-verificatie blijft ongewijzigd in
madoc-ts, de nieuwe frontend-container is pure statische bestandsserving).

### Refactoring & hernoeming: services/citizen-science → services/dissco-cs
**Status: Deel 1 uitgevoerd, Deel 2 gepland, Deel 3 vermoedelijk uitgevoerd** (huidige
structuur heet al `dissco-cs`). Deel 1: `requireSiteAdmin`-helper en `runOrderedUpdate`-
deduplicatie in de backend. Deel 2 (nog te doen indien niet ingehaald): route-splitsing
van `api/src/app.ts` (716 regels, 20+ routes) naar aparte bestanden per feature-groep
(`forum.routes.ts`, `site-pages.routes.ts`, enz.). Deel 3: volledige naam-mapping
`citizen-science` → `dissco-cs` (routes, code, bestanden, mappen, i18n, docker-compose),
inclusief een Postgres schema-naamswijziging (clean start, geen migratie) en een
branch-strategie om fork-code van upstream te scheiden.

### Checklist: dissco-cs naar verse upstream fork
Draaiboek (geen "uit te voeren plan" maar een naslag-checklist) voor het overzetten van de
dissco-cs-service naar een verse Madoc-fork: welke bestanden/mappen te kopiëren
(`services/dissco-cs/`, gateway-conf, service-JWT-registratie), welke bestaande upstream
bestanden aan te passen (`docker-compose.yml` met 4 wijzigingen, `.env`, `shared-postgres/
entrypoint.sh`), en wat expliciet **niet** meer nodig is (aparte frontend-container/conf —
vervallen na het samenvoegen van api+frontend in één Dockerfile/container).

### Gateway wachten op madoc-ts (lokale dev-ervaring)
Probleem: bij lokaal opstarten (`bin/madoc up`) is de gateway sneller online dan
madoc-ts, wat leidt tot mislukte requests totdat je herhaaldelijk ververst. Voorstel: een
additief `docker-compose.override.yml` (automatisch gemerged door `docker compose up`
zonder `-f`-vlaggen) met een healthcheck op madoc-ts (poort 3000) en `gateway.depends_on:
madoc-ts: condition: service_healthy`. Geen wijziging aan het gedeelde
`docker-compose.yml` nodig; test-/e2e-paden (expliciete `-f`-lijsten) blijven ongemoeid.

### Stappenplan: eerste testversie naar de dev-server
Draaiboek voor een manueel build→tar→scp→load deploy-mechanisme (geen GitHub
Actions/registry) naar de interne dev-VM, met een `docker-compose.release.yml`
(image-referenties i.p.v. lokaal bouwen) en `docker-compose.dev.yml` (Mailpit-mailcatcher,
poorten enkel op `127.0.0.1`). Beschrijft ook hoe dezelfde gebouwde image later
(ongewijzigd) naar productie gepromoot kan worden, en dat elke omgeving zijn eigen,
losstaande databank-inhoud behoudt (enkel het schema wordt door migraties bijgewerkt).

---

## Taken & annotatie

### Nieuw taken/annotatie-scherm in services/citizen-science/frontend
**Status: Fase 1 uitgevoerd** (incl. choice-structuurnavigatie, vooruitgehaald uit Fase 2
omdat bleek dat **elk** capture model server-side altijd als `structure.type: 'choice'`
wordt opgeslagen — ook bij één item; Madoc's admin-editor verbergt dat enkel visueel).
Bouwt een volledig eigen, generieke renderer (OpenSeadragon-viewer + Mirador-iframe-optie,
capture-model-formulier met type-registry-patroon) die rechtstreeks tegen Madoc's
bestaande crowdsourcing-API praat, zonder madoc-ts-broncode te importeren. Tijdens de
implementatie zijn een aantal claim/abandon-bugs gevonden en gefixt (race condition bij
`getProjectModel`, foute query-cache-invalidatie-key, claim/release samengevoegd zodat
manifest-naar-manifest-navigatie geen claims meer laat "lekken"). **Fase 2** (resterende
veldtypes, polygon-selector) staat nog open, als apart vervolgplan.

### Compacte specimen-metadata + IIIF drag-icon op de taakpagina
**Status onbekend.** Twee losse toevoegingen aan `AnnotatePage.tsx`: (1) een compact,
standaard ingeklapt metadata-paneel (popover i.p.v. Madoc's permanente, ruimte-vretende
sidebar-tabel) gevoed door een nieuw `getSiteManifest`-callje naar een al bestaand publiek
Madoc-endpoint; (2) een IIIF drag-icon (klik = manifest in nieuw tabblad, sleep = toevoegen
aan externe IIIF-viewer), eigen kopie van Madoc's bestaand `IIIFDragIcon`-patroon.

### Manifest-zichtbaarheid/claim-fixes (oude, ingebedde editor) — vermoedelijk vervallen
Twee vroege plannen (een concrete fix, en een diagnostische-logging-tussenstap) losten op
dat een manifest waar gebruiker A aan werkt onterecht zichtbaar bleef voor gebruiker B, in
de **oude**, ingebedde `services/madoc-ts/src/frontend/site/citizen-science/`-code
(`FloatingEditor.tsx`, `ProjectDetail.tsx`). Kernmechanisme (nog steeds relevant als
achtergrondkennis): status `-1` ("abandoned") via `api.updateTask` bij het verlaten van een
pagina zonder op te slaan, gecombineerd met server-side gefilterde manifestenlijsten i.p.v.
client-side filtering (die laatste faalt voor gewone contributors zonder admin-scope). Zie
ook `MANIFEST-CLAIMS.md` in deze map, die dezelfde kennis documenteert — controleer bij
hergebruik of de daar genoemde bestanden nog bestaan in de huidige, losgekoppelde
architectuur.

---

## Statistieken

### Eigen statistieken-laag in citizen-science-api (voortgang, sitewide stats, honour board)
**Status onbekend.** Loste een concrete bug op: de voortgangsbalk toonde 50% i.p.v. 29%
omdat afgekeurde/verlaten taken (status `-1`) volledig uit zowel teller als noemer
verdwijnen bij Madoc's eigen `project.statistics`-berekening (die niet gepatcht mag worden,
fork-isolatie). Oplossing: een eigen, klein telsysteem (`stats_completions`,
`stats_excluded_projects`) dat zijn eigen rij wegschrijft op het moment van indienen zelf,
los van wat er later met de taak in Madoc gebeurt — inclusief per-project uitsluiting van
site-brede totalen (voor foutief geconfigureerde, verwijderde projecten) zonder de
individuele eer van een vrijwilliger te laten vervallen.

### Stats-kaart (vrijwilligers + voltooide taken) op homepage — geparkeerd
**Status: geparkeerd**, vermoedelijk ingehaald door de statistieken-laag hierboven. Destijds
geblokkeerd omdat de benodigde data (totaal gebruikers, totaal voltooide taken) niet publiek
opvraagbaar was zonder een upstream Madoc-bestand te wijzigen (admin-only/auth-vereisende
endpoints). Een "honour board"/leaderboard bleek sowieso een apart, groter project (nieuwe
tijdvak-aggregaties, pre-berekening gezien 762k+ taken).

---

## Site-beheer & content

### Site Management: pagina's aan/uit + bewerkbare content (about/help)
**Status onbekend.** Bouwt `PageManagement.tsx` uit van placeholder naar een echte
admin-UI: per pagina (forum/about/help/instituten) een aan/uit-toggle, en voor about/help
ook bewerkbare Markdown-content per taal (nl/en/fr/de), opgeslagen in één `site_pages`-tabel
(`jsonb`-kolom per taal). Kernrisico dat eerst opgelost moest worden: anonieme bezoekers
hebben geen JWT, dus `citizen-science-api` moest een publieke site-by-slug-resolutie
toevoegen (via het bestaande service-JWT-mechanisme) om ook zonder login te weten welke
site het betreft. Fail-open bij API-fouten (alles tonen als actief, nooit een witte pagina).

### Welkomstbericht voor nieuwe gebruikers (eerste login na registratie)
Volledig uitgewerkt plan dat **hergebruikt** het `site_pages`-mechanisme hierboven: `welcome`
als nieuwe pagina-sleutel, geen nieuwe tabel/route/scherm. Trigger zonder een blijvende
"gezien"-status bij te houden: de activatie-route (`/activate-account`) redirect na succes
naar `/?welcome=1`, en een nieuwe `WelcomeModal` toont zich enkel bij die precieze query-param
— een gewone login of wachtwoord-reset triggert dit nooit.

### Meldingen-systeem (announcements) voor homepage/projectenoverzicht/projectdetail
**Status onbekend, ontworpen vóór de architectuur-migratie.** Voorstel voor een eigen,
geïsoleerde tabel (`citizen_science_announcements`) + admin-CRUD-scherm, met targeting
(homepage/projectenoverzicht/specifiek project), start-/einddatum, handmatige
aan/uit-toggle, en wegklikbaar per bezoeker (`localStorage`). Let op: de bestandspaden in
dit plan (`services/madoc-ts/src/frontend/site/citizen-science/...`) horen bij de oude,
ingebedde architectuur — bij hervatten eerst nagaan of dit ondertussen in
`services/dissco-cs` hoort te landen.

### Leesstatus message board: naar de databank + correcte 0-replies indicator
**Status onbekend.** Verhuist de "ongelezen"-indicator van het forum van `localStorage`
(per browser) naar een nieuwe tabel `forum_read_state` (per account, `user_id + topic_id →
last_seen_reply_count`). Lost meteen een logicabug op: een topic met 0 replies gold voordien
altijd als "ongelezen" totdat je het opende, ook al was de body al zichtbaar in de lijst.

---

## Taal & i18n

### Geparkeerd: talen-configuratie centraliseren
**Status: geparkeerd**, vermoedelijk ingehaald door het databank-gedreven talen-plan
hieronder. Onderzocht hoe de hardcoded talenlijst (nl/en/fr/de), die op 3 plekken
losstaat (frontend-config, backend-validatie-enum, een pure duplicaat-type), het best
gecentraliseerd wordt. Conclusie destijds: backend-validatie kan nooit volledig wegvallen
(publiek HTTP-endpoint, clientside restricties bieden geen serverside garantie); een
env-var heeft enkel echte meerwaarde voor de **backend**-lijst (restart i.p.v. rebuild),
niet voor de build-time gebundelde frontend. Een volledig DB-gedreven per-site-instellingen-
aanpak werd expliciet **verworpen** als te zwaar voor een niet-multi-tenant site.

### Databank-gedreven talen voor dissco-cs
Volledig uitgewerkt, groter plan dat het bovenstaande vraagstuk in feite vervangt/oplost:
**inhoudstalen** (waarin instituten/pagina's content invullen) volgen voortaan rechtstreeks
Madoc's `displayLanguages`; **interfacetaal** blijft Engels als vast gebundeld sjabloon in
de repo, aangevuld met elke taal waarvoor een beheerder via een nieuw admin-scherm
(`/beheer/talen`) een vertaal-JSON heeft geüpload naar een nieuwe databanktabel
(`dissco_cs_translations`). Introduceert een **hash-vergelijking** van het Engelse
referentiebestand (niet enkel een sleutel-telling) om ook "stilzwijgend herschreven"
Engelse tekst te detecteren als reden voor een "verouderd"-waarschuwing, zichtbaar als
badge op de Site-beheer-hub. Bevat een concreet, eenmalig uitrolplan (huidige nl/fr/de-
content bewaren, na herbuild opnieuw uploaden via het nieuwe scherm).

---

## Authenticatie

### Eigen auth-formulieren in dissco-cs (register/login/wachtwoord)
Volledig uitgewerkt plan. Loste drie problemen op met Madoc's eigen server-gerenderde
auth-pagina's: een niet-uitschakelbare kapotte zoekbalk in de header, een hardcoded
"terug naar Madoc-homepage"-link (fout bij mailserverstoring tijdens registratie), en het
ontbreken van een wachtwoord-sterkte-check. Oplossing: eigen React-pagina's
(`Login.tsx`/`Register.tsx`/`ForgotPassword.tsx`/`SetPassword.tsx`) die rechtstreeks nieuwe
JSON-endpoints aanroepen in **één nieuw bestand** `services/madoc-ts/src/routes/
dissco-cs-auth.ts` (mirror van de bestaande `register.ts`/`login.ts`/etc., met bewuste
codeduplicatie van twee kleine helper-functies om `register.ts` zelf 100% onaangeroerd te
laten) — geregistreerd via een puur additieve wijziging in `router.ts` (5 imports + 5
regels). Inclusief uitnodigingslinks (`?code=...`), die voortaan ook op de eigen pagina
landen i.p.v. Madoc's. Wachtwoordbeleid: min. 8 tekens, 1 letter, 1 cijfer, client- én
server-side gevalideerd.

---

## Huidig geparkeerd plan: automatisch vrijgeven van vastzittende "bewaarde" taken

**Status: geparkeerd op verzoek van de gebruiker (2026-07-17), plan staat klaar om
hervat te worden.**

Aanleiding: een gebruiker die een taak "bewaart" (status `1`, draft) en daarna lang
wegblijft, blijft die taak voor altijd bezet houden voor andere gebruikers. Kernvraag was
of hiervoor een volledig nieuw job-systeem opgezet moest worden.

**Belangrijkste bevinding:** dat systeem bestaat al in Madoc-core — een werkende
`node-schedule`/`CronJobs`-registry (`services/madoc-ts/src/utility/cron-jobs.ts`,
geregistreerd in `app.ts`), inclusief een admin-API om jobs te bekijken en handmatig te
triggeren (`GET /api/madoc/cron/jobs`, `POST /api/madoc/cron/jobs/:jobId/run`). Er draait
zelfs al een vergelijkbare job (`check-expired-manifests`, elke 15 min) — maar die dekt
dissco-cs-projecten niet: hij slaat projecten over tenzij `contributionMode ===
'transcription'` (dissco-cs-projecten draaien standaard met `contributionMode: 'annotation'`
+ `claimGranularity: 'canvas'`), en filtert bovendien enkel op manifest-niveau taken, niet
canvas-niveau.

**Gekozen aanpak:** geen nieuw job-systeem, maar één nieuw, geïsoleerd cron-bestand
(`services/madoc-ts/src/cron/release-stale-tasks.ts`, fork-addition naar het patroon van
`routes/dissco-cs-auth.ts`) + één registratie-regel in `app.ts`, zonder
`check-expired-manifests.ts` aan te raken. Drempel: hergebruik van het bestaande
projectconfig-veld `longExpiryTime` (minuten), met een fallback-default van 7 dagen als
het niet ingesteld is (i.p.v. de upstream default van 1 dag, die voor een ander scenario
bedoeld is).

**Let op — architectuurvraag nog niet opgelost:** dit plan is opgesteld tegen
`services/madoc-ts`'s eigen cron-mechanisme, vanuit de veronderstelling dat de
taken/annotatie-flow nog (deels) via madoc-ts loopt. Gezien de latere migratie naar
`services/dissco-cs` als zelfstandige dienst (zie architectuur-sectie hierboven), moet bij
hervatten eerst bevestigd worden of dit mechanisme nog steeds in madoc-ts moet landen, of
dat `services/dissco-cs/api` inmiddels zelf verantwoordelijk is voor taakstatussen en een
eigen periodieke taak (bv. via `node-schedule` in de eigen Hono-service, of een simpele
`setInterval`) meer voor de hand ligt.
