---
inclusion: manual
---

# Productanalyse — dissco-cs (DoeDat)

> Baseline-document gegenereerd op basis van codebase-analyse. Beschrijft wat de applicatie functioneel doet, afgeleid uitsluitend van de code. Geen aannames over toekomstige plannen.

---

## Wat is dit?

**DoeDat** is een citizen science-platform gebouwd door Plantentuin Meise (Meise Botanic Garden). Het stelt vrijwilligers in staat om wetenschappelijke data te transcriberen — primair botanische collectierecords in de vorm van IIIF-manifests. Het platform werkt als een laag bovenop **Madoc**, een bestaand IIIF-annotatie- en taakbeheersysteem. DiSSCo-CS levert de aanvullende functionaliteit (communityfeatures, statistieken, beheer) die Madoc zelf niet biedt.

De applicatie wordt per site-instantie gedeployed en is meertalig: Nederlands, Engels, Frans en Duits.

---

## Gebruikersrollen

| Rol           | Toegang                                                                 |
|---------------|-------------------------------------------------------------------------|
| **Bezoeker**  | Homepage, projectenlijst, institutiespagina's, statistieken, honour board |
| **Vrijwilliger** | Alles van bezoeker + annoteren, eigen dashboard, forum, review-feedback lezen |
| **Reviewer**  | Alles van vrijwilliger + reviewtaken-overzicht                          |
| **Admin**     | Alles + sitebeheer: pagina's, aankondigingen, instellingen, gebruikers, projecten, handmatige taken |

Authenticatie en gebruikersbeheer worden volledig gedelegeerd aan Madoc. De CS-API leest de rol uit het JWT-token (`site.admin` scope) of raadpleegt via de Madoc-gateway de site-rol van de gebruiker (`reviewer`).

---

## Kernfunctionaliteit

### 1. Annoteren van IIIF-manifests
Vrijwilligers kunnen manifests (digitale afbeeldingen van collectieobjecten) openen en annoteren via een formulier. De annotatieinterface bestaat uit:
- een **OpenSeadragon-viewer** voor het bekijken van de afbeelding
- een **CaptureModelForm** voor het invullen van gestructureerde velden (op basis van Madoc's capture model)
- integratie met **pdfjs-dist** (PDF-ondersteuning naast afbeeldingen)

Wanneer een vrijwilliger een taak loslaat (`abandon`), herberekent de CS-API de manifest-teller in Madoc zodat het manifest weer beschikbaar wordt voor anderen. Dit lost een bekende bug in Madoc op waarbij manifests permanent geblokkeerd bleven na een abandon bij `maxContributors:1`.

### 2. Projectenoverzicht en voortgang
- De **projectenlijst** (`/explore`) toont alle beschikbare annotatiepro­jecten.
- Per project is er een **detailpagina** met voortgangsstatistieken: percentage getranscribeerd, beschikbare manifests, en visuele progress-indicatoren.
- De voortgangsdata wordt samengesteld door de CS-API op basis van Madoc-taak­statussen en manifest-aantallen.
- Projecten kunnen worden gekoppeld aan een **instelling** (bijv. een herbariumcollectie van een specifiek museum).

### 3. Instellingenpagina's
- Overzicht van deelnemende instellingen (`/institutions`).
- Per instelling: beschrijving, contactgegevens, logo, en gekoppelde projecten.
- Per instelling is er een eigen **honour board** en **statistiekenwidget**, vergelijkbaar met de site-brede versies.

### 4. Statistieken (sitebreed)
Een banner op de homepage en andere pagina's toont live:
- **aantal actieve vrijwilligers** (geteld uit de Madoc-database)
- **aantal voltooide taken** (geteld uit de tasks-API-database)
- **totaalaantal taken**

Deze data wordt berekend door direct de database-schema's van Madoc (`madoc_ts`) en de tasks-API (`tasks_api`) te bevragen — niet via de Madoc-gateway-API, om schaalbaarheidsproblemen te vermijden.

### 5. Honour Board (leaderboard)
Toont de top-3 vrijwilligers en de positie van de ingelogde gebruiker, uitgesplitst in vier periodes:
- **Vandaag**
- **Deze week** (maandag t/m zondag)
- **Deze maand**
- **Legende** (all-time)

De ranglijst telt voltooide en ingediende taken per gebruiker. De berekening houdt rekening met een subtiel probleem: een reviewer die een oude inzending goedkeurt zou anders de teller van de originele vrijwilliger verkeerd in een periode plaatsen — dit wordt opgelost door status-3 taken te tellen op `created_at` in plaats van `modified_at` bij periodebegrensde views.

De data wordt in-memory gecached met stale-while-revalidate: bezoekers zien nooit een laadvertraging door de leaderboard-query.

### 6. Forum (berichtenbord)
Geauthenticeerde gebruikers kunnen discussietopics aanmaken en beantwoorden, bereikbaar via `/messageboard`. Features:
- topics aanmaken (met optionele koppeling aan een project)
- replies plaatsen
- ongelezen-indicatie per topic
- topics sluiten of verwijderen (voor admins)
- replies verwijderen (voor admins)

Het forum is per Madoc-site gescheiden (site_id).

### 7. Review-workflow
Reviewers en admins hebben toegang tot `/review`, een overzicht van alle crowdsourcing-taken die ter beoordeling staan. Het overzicht toont:
- de indiener van de taak
- het project en het subject (manifest)
- de toegewezen reviewer
- de huidige status

Reviewers kunnen de inhoud van een inzending inline uitklappen om te beoordelen. De review-workflow zelf (goedkeuren/afwijzen) wordt uitgevoerd in Madoc; de CS-API aggregeert en presenteert de taken.

### 8. Review-feedback (privéberichten)
Na een review kan een reviewer privé feedback sturen naar de vrijwilliger die de taak heeft ingediend. Dit werkt als een eenvoudig berichtensysteem met threads en replies, gescheiden van het publieke forum. Threads kunnen worden verborgen door zowel reviewer als ontvanger.

### 9. Aankondigingen
Admins kunnen aankondigingen (`announcements`) aanmaken die zichtbaar zijn:
- site-breed
- op een specifieke projectpagina

Aankondigingen hebben een optionele start- en einddatum, zijn meertalig (NL/EN/FR/DE), en worden weergegeven als banner op de betreffende pagina.

### 10. Contactformulier
Een contactformulier op `/contact` stuurt een e-mail naar het geconfigureerde contactadres van de site. Beveiligd met een honeypot-veld en een in-memory rate limiter per IP-adres. Het contactadres en het tonen van het formulier zijn instelbaar via de sitepagina-instellingen.

### 11. Projecthandleidingen
Admins kunnen per project een handleiding aanmaken in meerdere talen (NL/EN/FR/DE), bestaande uit:
- een tekstuele inhoud (Markdown)
- een optionele bijlage (PDF of ander bestand, opgeslagen als BYTEA in de database)

Vrijwilligers zien de handleiding als modal op de projectpagina. Handmatige koppeling tussen een project (via slug) en een handleiding gebeurt in het beheerportaal.

### 12. Sitepaginabeheer
Pagina's zoals "Over", "Help", "Instellingen", "Contact" en "Forum" kunnen door admins:
- worden geactiveerd of gedeactiveerd (verdwijnt uit navigatie en geeft 404/redirect)
- worden voorzien van meertalige inhoud (Markdown)
- worden gesorteerd in de navigatie

Dit maakt het platform aanpasbaar per Madoc-site-instantie zonder code-wijzigingen.

### 13. Beheerportaal (`/manage`)
Het beheerportaal biedt admins een centrale plek voor:

| Subpagina               | Functie                                                      |
|-------------------------|--------------------------------------------------------------|
| `/manage`               | Overzicht/dashboard van beheergebieden                       |
| `/manage/projects`      | Projecten beheren, handmatig aanmaken, handliedingen koppelen, stuck tasks bekijken, debug-info |
| `/manage/announcements` | Aankondigingen aanmaken, bewerken, verwijderen               |
| `/manage/users`         | Gebruikersoverzicht (via Madoc)                              |
| `/manage/pages`         | Pagina's activeren, inhoud bewerken, volgorde bepalen        |
| `/manage/institutions`  | Instellingen aanmaken, bewerken, koppelen aan projecten      |

### 14. Stuck tasks-beheer
De API detecteert manifests die "vastzitten": claims die niet zijn losgelaten maar ook niet zijn ingediend, waardoor manifests voor alle gebruikers geblokkeerd blijven. Admins kunnen via het beheerportaal:
- vastzittende taken zien (inclusief hoe lang ze al vastzitten)
- individuele taken loslaten
- de manifest-teller handmatig herberekenen

### 15. Zoekfunctie
Een zoekpagina (`/find`) stelt gebruikers in staat om door projecten en content te zoeken. De implementatie delegeert aan de Madoc-zoekmechanismen.

---

## Architecturele rol in het grotere systeem

DoeDat is geen zelfstandige applicatie — het is een **uitbreidingsservice bovenop Madoc**:

```
Browser
  │
  ├── /s/{slug}/*        → Madoc (React-frontend + Koa-backend)
  ├── /api/madoc/*       → Madoc API (gateway)
  ├── /api/tasks/*       → tasks-API (gateway)
  └── /api/dissco-cs/*  → DiSSCo CS API (Hono)  ← dit project

DiSSCo CS API
  ├── Eigen PostgreSQL-schema (dissco_cs)
  ├── Readonly toegang tot tasks_api-schema
  ├── Readonly toegang tot madoc_ts-schema
  └── HTTP-calls naar Madoc-gateway (service JWT)
```

De frontend van DoeDat wordt in productie als statische bestanden ingebouwd in de Docker-container van de CS-API en geserveerd onder `/cs-assets/*`. De SPA-routes worden geserveerd onder `/s/{slug}/*`, hetzelfde pad-prefix als Madoc, waardoor de gateway requests op basis van het pad kan scheiden.
