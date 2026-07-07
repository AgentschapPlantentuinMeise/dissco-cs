# Stats-kaart (vrijwilligers + voltooide taken) — onderzoek, geparkeerd

Documentatie van het onderzoek naar een "DOEDAT STATS"-widget op de Homepage (zoals gezien op
DoeDat: "1347 Volunteers", "748373 tasks of 762577 completed") en een "Honour Board"-leaderboard.
Bedoeld zodat dit niet opnieuw uitgezocht moet worden als de feature weer ter sprake komt.

## Wat gevraagd werd

Op [Homepage.tsx](pages/homepage/Homepage.tsx) een kaart tonen met:
- Totaal aantal vrijwilligers/gebruikers
- Totaal aantal taken voltooid t.o.v. totaal aantal taken
- (optioneel, apart, groter stuk werk) een leaderboard "Honour Board" met badges per tijdvak
  (dag/week/maand/all-time) per gebruiker

## Honour Board / leaderboard

Bestaat nergens in Madoc. Zou nieuwe tijdvak-aggregaties per gebruiker vereisen, en gezien
762k+ taken waarschijnlijk pre-berekening/caching (materialized view of cronjob) i.p.v. live
queries. Apart, groter project — niet verder uitgezocht.

## Stats-kaart: waarom dit niet "gewoon" kan met bestaande endpoints

De twee voor de hand liggende bronnen zijn **niet publiek toegankelijk** voor een anonieme
bezoeker van de homepage:

- **Totaal gebruikers**: `SiteUserRepository.countAllUsers()`
  (`repository/site-user-repository.ts`), blootgesteld via `GET /api/site/users`
  (`routes/global/list-all-users.ts`) — vereist `onlyGlobalAdmin`.
- **Taken voltooid/totaal**: `api.getAllTaskStats()` (`gateway/api.ts`, methode rond regel 1919)
  roept `/api/tasks/stats` aan. Dit pad wordt doorgestuurd naar de losse Task API-microservice
  (zie `gateway/internal-fetch-json.ts`, prefixes als `/api/tasks` worden doorgegeven) en vereist
  een geldig JWT. Een anonieme bezoeker krijgt hier een 401.
- Het enige al-publieke aggregatie-endpoint, `/api/madoc/iiif/statistics`
  (`routes/iiif/statistics.ts`, gebruikt `optionalUserWithScope(context, [])`), geeft alleen
  collections/manifests/canvases/projects-counts terug — geen user- of taakvoltooiingscijfers.

`createUniversalComponent` (de server-side renderfunctie achter site-pagina's, zie
`frontend/shared/utility/create-universal-component.ts` en het voorbeeld
`frontend/site/pages/loaders/project-list-loader.tsx`) lost dit niet op: de `api`-instantie die
aan `getData` wordt doorgegeven is dezelfde `ApiClient` met de auth-context van de bezoekende
gebruiker, geen geprivilegieerd service-account. Server-side renderen verandert dus niets aan de
auth-blokkade voor anonieme bezoekers.

## Waarom dit niet zomaar opgelost wordt met een nieuwe route

Project-regel (fork-isolatie, zie ook `CLAUDE.md`): voor citizen-science features worden geen
upstream/core Madoc-bestanden aangepast (`gateway/api.ts`, `router.ts`,
`routes/global/list-all-users.ts`, enz.), ook niet voor een kleine, geïsoleerde nieuwe publieke
route. Alle nieuwe logica moet binnen
`services/madoc-ts/src/frontend/site/citizen-science/` blijven.

## Beslissing (2026-06-17)

Voorlopig **geparkeerd**. Geen implementatie nu. Toekomstige richting die de gebruiker wil
verkennen: een eigen, apart bijgehouden datapad/databank binnen de citizen-science-module die
statistieken zelf logt (los van de bestaande admin-only/auth-vereisende Madoc-endpoints),
te ontwikkelen samen met andere nog te bouwen features in deze module.

## Als dit weer opgepakt wordt

Opties die toen ter discussie stonden:
1. **Eigen databron binnen de citizen-science-module** (gekozen richting): periodiek (cron/job)
   met een geprivilegieerd account de cijfers ophalen en zelf opslaan/cachen, homepage leest die
   eigen, publieke databron.
2. Stats-kaart alleen tonen aan ingelogde bezoekers (dan werken bestaande endpoints met hun eigen
   JWT, geen nieuwe infrastructuur nodig, maar anonieme bezoekers zien niets).
3. Bewuste uitzondering op de fork-isolatieregel: één klein, expliciet publiek endpoint toevoegen
   dat alleen totaalcijfers teruggeeft — vereist wijziging aan upstream bestanden, dus alleen na
   uitdrukkelijke goedkeuring.
