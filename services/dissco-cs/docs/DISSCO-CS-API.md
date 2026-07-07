# Eigen backend + databank voor citizen-science (services/citizen-science/api)

Documentatie van de architectuurbeslissing en het werk om citizen-science features een eigen
backend/databank te geven, los van Madoc. Bedoeld zodat dit niet opnieuw uitgezocht moet worden.
Zie ook `services/citizen-science/api/README.md` voor service-specifieke details (endpoints, env
vars, lokaal draaien).

## Vraag die hieraan voorafging

De citizen-science frontend-pagina's (deze map) hebben voor sommige features (bv. de geparkeerde
stats-widget, `STATS-WIDGET.md`, en het forum) eigen backend-logica en een eigen databank nodig.
Vraag was of de hele map (frontend + backend + db) beter naar een ander niveau in `services/`
verhuist.

## Beslissing (2026-06-17)

**Frontend blijft hier staan.** De pagina's zijn diep verweven met Madoc's eigen site-shell
(`use-api`, `use-site`, `use-project`, `use-route-context`, `manifest-loader`) — dat elders
herbouwen is een grote, risicovolle herwerking zonder voordeel.

**Backend + databank komen in een volledig nieuwe top-level service**: `services/citizen-science/api/`,
gebouwd naar het precedent van `services/config-service` (eigen Hono-server, eigen
Postgres-rol/schema, eigen gateway-locatie). Reden: een nieuwe backend-route **binnen** madoc-ts
vereist altijd een edit aan `services/madoc-ts/src/router.ts` (geen auto-discovery) — dat raakt
een upstream-bestand, wat niet mag voor citizen-science features (fork-isolatieregel, zie ook
`CLAUDE.md` en memory `feedback_fork_isolation`).

Volledig stappenplan + architectuuroverwegingen: zie
`C:\Users\karolien\.claude\plans\services-we-hebben-nu-functional-fog.md`.

## Wat is opgezet

- **Infra**: eigen Postgres-schema (`citizen_science`) in `shared-postgres`, eigen gateway-route
  (`/api/citizen-science/*`) met dezelfde JWT-validatie als de rest van de gateway, eigen
  docker-compose-service. Geen enkele upstream madoc-ts-broncode aangepast — enkel additieve
  blokken in infra-bestanden (`.env`, `docker-compose.yml`, `shared-postgres/entrypoint.sh`) die
  het bestaande herhalende patroon volgen.
- **Madoc-verrijking**: de CS-API kan zelf bij Madoc's API (bv. projectdata) via het
  service-JWT-mechanisme dat madoc-ts al voor zichzelf gebruikt
  (`services/madoc-ts/src/utility/sync-jwt-requests.ts`) — geverifieerd met een echte
  server-naar-server call naar `/api/madoc/projects`.
- **Patroon voor toekomstige koppelingen met Madoc-data** (bv. project ↔ instituut): CS-databank
  houdt enkel een los ID-veld (geen DB-foreign-key, want ander schema/proces), CS-API verrijkt
  on-the-fly via een service-JWT-call naar Madoc's bestaande endpoints. Concreet datamodel hiervoor
  nog niet uitgewerkt (bewust geparkeerd, te plannen wanneer er een concrete koppeling nodig is).

## Forum (volledig binnen citizen-science gebouwd)

Het forum (`pages/message-board/MessageBoard.tsx`) was tot nu toe `localStorage`-only. Dit is als
eerste feature volledig op de nieuwe CS-API aangesloten, omdat het forum **geen** Madoc-data nodig
heeft (de `taskUrl` is een vrije link-string, geen op te zoeken Madoc-id) — dus geen
Madoc-verrijking nodig, puur CS-eigen data.

- **Datamodel**: `forum_topics` + `forum_replies` in de `citizen_science`-schema, per site
  gescheiden via `site_id` (zie `services/citizen-science/api/src/db.ts`).
- **Auteurschap**: nooit een door de client opgegeven naam vertrouwen. De browser stuurt zijn
  bestaande Madoc-sessie-JWT (cookie `madoc/{slug}`, zelfde mechanisme als
  `gateway/api.browser.ts`) mee naar de CS-API; die decodeert de payload
  (`src/jwt.ts: requestMadocUserIdentity`) voor `userId`/`siteId`/`name`. De gateway heeft de
  handtekening al gevalideerd.
- **Endpoints**: `GET/POST /api/citizen-science/forum/topics`,
  `GET /api/citizen-science/forum/topics/:id`, `POST .../topics/:id/replies`.
- **Frontend**: nieuwe `utils/cs-api.ts` (los bestand, geen upstream wijziging) met een kleine
  fetch-wrapper; `MessageBoard.tsx` haalt nu topics/replies op via deze API i.p.v. `localStorage`.
  De "gezien"-status (ongelezen-badge) blijft bewust client-only in `localStorage` — dat is
  UI-voorkeur, geen data die gedeeld moet worden.

Backend volledig end-to-end getest (curl + handmatig gegenereerd test-JWT): topic aanmaken, reply
toevoegen, detail ophalen, 401 zonder geldig token.

## Open punt: SSR "Page not found" op niet-homepage CS-routes

Bij het testen van de forum-pagina in de browser bleek dat **alle** citizen-science-routes behalve
de homepage (`/s/{slug}/about`, `/my-tasks`, `/messageboard`) "Page not found" teruggeven bij
server-side rendering via de gateway in deze testomgeving — ook routes die niet door dit werk zijn
aangeraakt. Dit is dus een **pre-existing omgevingsprobleem** (waarschijnlijk een verouderde/niet
herbouwde SSR-bundel), geen regressie door de forum-wijzigingen. Nog te onderzoeken/bevestigen door
zelf in te loggen en de pagina te bezoeken, of de SSR-build apart te debuggen.

## Structurele consolidatie (2026-06-18)

`services/citizen-science-api/` is verhuisd naar `services/citizen-science/api/` — één
overkoepelende map voor alles wat bij citizen-science hoort. De docker-servicenaam
(`citizen-science-api`), gateway-route en JWT-identiteit blijven ongewijzigd (enkel het
mappad in `docker-compose.yml`'s `build.context` is aangepast), dus dit raakt geen logica.

Een **kopie** (niet verplaatsing) van de frontend komt in `services/citizen-science/frontend/`
— het origineel hier in madoc-ts blijft bestaan en functioneel. Die kopie krijgt een eigen,
kleine API-client, een eigen router, en (voor de taak/annotatie-pagina's) een eigen
OpenSeadragon-viewer + formulier i.p.v. Madoc's generieke capture-model-editor. Cruciaal
hierbij: Madoc's auth-cookie is `Path=/s/{slug}`-gescoped, dus de kopie moet via een nieuwe
gateway-route onder datzelfde pad bediend worden, anders werkt inloggen niet. Volledig
ontwerp (incl. beveiligingsanalyse) staat in
`C:\Users\karolien\.claude\plans\services-we-hebben-nu-functional-fog.md`.

## Status

Dit werk staat momenteel als experiment op `main`, niet gecommit — de definitieve versie wordt
later op een eigen branch opgezet (zie memory `project_citizen_science_api_architecture`).
