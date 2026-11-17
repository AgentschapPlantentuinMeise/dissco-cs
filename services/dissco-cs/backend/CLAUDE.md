# CLAUDE.md — services/dissco-cs/backend

Regels voor de backend. Zie ook `../CLAUDE.md` (gedeeld met de frontend).

## Schrijfroutes (services/dissco-cs backend)

- **Naamgeving:** een controller, repository en cs-client-bestand heten naar hetzelfde onderwerp, en dat is ook het pad van de route (`forum.controller.ts`, `forum.repository.ts`, `cs-client/forum.ts` → `/forum`). Geen algemene namen zoals `me`.
- **Validatie en toegang op de route:** de body met `validateJson(schema)` en het gedeelde zod-schema, de padparameters met `validateParams`; in de handler `c.req.valid('json' | 'param')`. Een body die we ongecontroleerd aan Madoc doorgeven (Madoc valideert zelf): `forwardJsonBody` of `readJsonBody`. Wie de route mag gebruiken: `requireUser`, `requireReviewerOrAdmin` of `requireSiteAdmin`, en `requireSiteId(c)` als de route de site nodig heeft.
- **Publieke route** (nieuw of gewijzigd, ook een subpad zoals `/current`): voeg hem toe aan de `auth_request`-uitzondering in `services/gateway/conf.d/services/dissco-cs-api.conf`, anders krijgt een bezoeker zonder login een 401.
- **Fouten zijn altijd `{ error: string }`-JSON**, net als Madoc. De tekst is voor ontwikkelaars en logs; de gebruiker ziet een vertaalde sleutel.
- **Werkwoorden:** `POST` = aanmaken of een actie, `PUT` = een ding volledig vervangen, `PATCH` = een deel wijzigen, `DELETE` = verwijderen.
- **Antwoord:** aanmaken → `201` + DTO; wijzigen, verwijderen of een actie → `204`. Enkel als de frontend het resultaat echt gebruikt, geef je het terug (bv. forumtopic sluiten → `closedAt`, prune → `{ removed }`).

## Tabellen (services/dissco-cs)

Elke nieuwe tabel in `backend/src/database/migrations.ts` valt onder een van deze soorten, en die bepaalt welke wie- en tijdvelden ze krijgt:

- **Inhoud van gebruikers** (forum, feedback): `author_user_id` + `author_name` en `created_at`. De auteur hoort bij de inhoud en wordt getoond, daarom staat de naam er ook bij.
- **Losse items van beheerders, met een eigen id** (announcements, institutions, manuals): `created_at`, `created_by`, `updated_at`, `updated_by`.
- **Vaste instellingen van beheerders, zonder eigen id** (nav_items, site_theme, site_images, home_steps, manual_attachments, koppeltabellen): `updated_at`, `updated_by`. De sleutel ligt vast en een rij wordt overschreven, dus "aangemaakt door" zegt niets.
- **Technische tabellen** (app_log, forum_read_state): geen wie-velden. Ze houden geen beheerdersactie bij.

Voor `created_by` en `updated_by`:

- Altijd `INTEGER NOT NULL`, met enkel het Madoc user id, zonder kopie van de naam.
- Ze zijn een spoor in de databank (bij wie moet je zijn als er een vraag is over een wijziging) en komen niet in een DTO.
- Een schrijffunctie in een repository krijgt `userId` als parameter; de controller geeft `identity.userId` door. Bij een insert vul je beide velden, bij een update of upsert enkel `updated_by`.
- Een wijziging raakt `created_at` nooit. Moet het laatst gewijzigde bovenaan: sorteer op `updated_at`.
- Er is bewust geen apart auditlog: een verwijderde rij laat geen spoor na.
