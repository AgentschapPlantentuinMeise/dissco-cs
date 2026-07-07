# Citizen Science API

Eigen backend + databank voor citizen-science-features, los van `madoc-ts`. Gebouwd naar het
patroon van `services/config-service` (zie ook
`services/madoc-ts/src/frontend/site/citizen-science/CITIZEN-SCIENCE-API.md` voor de volledige
architectuurbeslissing en context).

## Waarom een apart service

- De citizen-science frontend-pagina's (`services/madoc-ts/src/frontend/site/citizen-science/`)
  blijven in madoc-ts, want ze zijn diep verweven met Madoc's eigen site-shell (auth, routing,
  project/manifest-data).
- Een nieuwe backend-route **binnen** madoc-ts vereist altijd een edit aan
  `services/madoc-ts/src/router.ts` (geen auto-discovery) — dat raakt een upstream-bestand, wat
  niet mag voor citizen-science features (fork-isolatieregel).
- Daarom: alle nieuwe backend/databank-logica voor citizen-science komt hier, als volledig apart
  service met eigen Postgres-schema, eigen gateway-route, geen wijzigingen aan upstream
  madoc-ts-broncode.

## Lokaal draaien

```bash
pnpm install
PORT=8001 POSTGRES_HOST=localhost POSTGRES_PORT=5400 POSTGRES_USER=citizen_science \
  POSTGRES_PASSWORD=citizen_science_password POSTGRES_DB=postgres \
  POSTGRES_SCHEMA=citizen_science MIGRATE=true pnpm dev
```

Of via de volledige stack: `docker compose up -d --build citizen-science-api`.

## Environment variables

| Variabele | Omschrijving | Default |
|---|---|---|
| `PORT` | Luisterport | `8000` |
| `MIGRATE` | Tabellen aanmaken bij opstart | `false` |
| `POSTGRES_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_DB` / `_SCHEMA` | Verbinding met het eigen `citizen_science`-schema in shared-postgres | zie `docker-compose.yml` |
| `MADOC_GATEWAY_URL` | Basis-URL om Madoc's eigen API te bereiken (voor verrijking) | `http://gateway:8080` |
| `MADOC_SERVICE_JWT_PATH` | Pad naar het door madoc-ts ondertekende service-token | `/app/service-jwt-responses/citizen-science-api.json` |

## Authenticatie

De gateway valideert JWT's al (`auth_request /_validate_jwt`) voor elk verzoek op
`/api/citizen-science/*` — deze service decodeert enkel de payload (`src/jwt.ts`), zonder de
handtekening opnieuw te verifiëren (vertrouwt op de gateway, zelfde patroon als
`config-service/src/jwt.ts`).

- **Gewone gebruikers-JWT** (van de browser, cookie `madoc/{slug}`): `requestMadocUserIdentity()`
  geeft `{ userId, siteId, name }` terug, gebruikt om auteurschap server-side af te leiden — nooit
  een door de client opgegeven naam vertrouwen.
- **Service-JWT** (deze API die zelf bij Madoc's API moet zijn): zie "Madoc-verrijking" hieronder.

## Madoc-verrijking (service-naar-service)

Wanneer CS-data verwijst naar Madoc-data (bv. een toekomstige koppeling project ↔ instituut),
combineert deze API dat zelf, in de backend-laag:

1. `services/madoc-ts/service-jwts/citizen-science-api.json` is een statisch aanvraagbestand
   (`{scope, service: {id, name}}`) in de map die madoc-ts bij opstart afspeurt
   (`syncJwtRequests()`).
2. madoc-ts ondertekent dit met zijn eigen RSA-key en schrijft het resultaat naar het gedeelde
   volume `./var/jwt/citizen-science-api.json` (zelfde mechanisme dat madoc-ts ook voor zichzelf
   gebruikt, zie `src/gateway/token.ts`).
3. `src/madoc-client.ts` leest dat token en roept Madoc's eigen API aan (bv.
   `GET /api/madoc/projects/:id`) via de gateway, met `x-madoc-site-id`-header.

Geverifieerd: een geslaagde call naar `/api/madoc/projects` en `/api/madoc/projects/:id` via dit
mechanisme (2026-06-17).

## Endpoints

- `GET /api/citizen-science/health` — status-check
- `GET /api/citizen-science/forum/topics` — lijst forumtopics voor de site van de ingelogde gebruiker
- `POST /api/citizen-science/forum/topics` — nieuw topic (`title`, `taskUrl`, `body`)
- `GET /api/citizen-science/forum/topics/:id` — topic + replies
- `POST /api/citizen-science/forum/topics/:id/replies` — reply toevoegen (`body`)

Datamodel: `forum_topics` / `forum_replies` (zie `src/db.ts`), per site gescheiden via `site_id`.

## Status (2026-06-17/18)

- Infra (schema, gateway-route, docker-compose, service-JWT) volledig opgezet en geverifieerd.
- Forum-feature volledig gebouwd (backend + frontend) en backend end-to-end getest met een
  handmatig gegenereerd test-JWT.
- Frontend-integratie (`MessageBoard.tsx`) kon niet visueel in een browser bevestigd worden: deze
  testomgeving geeft "Page not found" bij SSR voor *alle* citizen-science-routes behalve de
  homepage (`/about`, `/my-tasks`, `/messageboard` — ook zonder mijn wijzigingen), dus een
  pre-existing omgevingsprobleem, geen regressie. Nog te verifiëren door zelf in te loggen en de
  pagina te bezoeken, of het SSR-probleem afzonderlijk uit te zoeken.
- Dit werk staat momenteel als experiment op `main` zonder commit — de definitieve versie komt op
  een nieuwe branch.
