# Architectuuraudit DiSSCo CS
*Onafhankelijke review — november 2026*

---

## Voorwoord

De code is over het geheel **beter dan gemiddeld** voor een project van deze omvang: consequente parametervalidatie, atomische bestandsschrijfacties, gedeeld typesysteem, duidelijke scheiding tussen service-token en user-token calls naar Madoc, en een SWR-cache die voorkomt dat polling de database overbelast. Dit zijn geen vanzelfsprekende keuzes.

De analyse hieronder gaat verder dan wat goed is en richt zich op wat kan breken, latent mis is, of fundamenteel anders had moeten worden.

---

## 1. Blinde vlekken — wat gegarandeerd breekt bij groei

### 1.1 De SwrCache is een tijdbom bij horizontale schaling

`SwrCache<K,V>` is een pure in-memory Map, per proces. Op dit moment draait alles op één container en werkt het prima. Maar zodra je twee replica's draait (voor uptime bij een deploy, load balancing, of een container-crash met warm-start), gedragen ze zich als twee volledig onafhankelijke cachepopulaties.

Bij drie replica's zijn er drie concurrente "background refresh"-queries op dezelfde `tasks_api.tasks`-tabel voor exact hetzelfde resultaat. Je betaalt de databaselast **keer het aantal replica's** — precies het tegenovergestelde van wat de cache beoogde.

Erger: het `peek()`-contract ("geeft alleen de cache, triggert nooit werk") is dan nutteloos voor de `/current`-polling. Die poll ziet altijd een lege cache op de replica's die niet de eerste request bedienden.

**Wanneer dit explodeert:** bij de eerste deployment zonder downtime (twee containers naast elkaar), of de eerste auto-scaling event.

**Oplossing:** een `CacheStore`-interface met een pluggable Redis-backend (zie sectie 4.4).

---

### 1.2 JWT-authenticatie zonder signature-verificatie

`jwtPayloadFromRequest()` in `auth/auth.ts` *decodeert* het JWT maar *verifieert de handtekening niet*. Geen `exp`-check, geen `nbf`, geen `iss`-validatie, geen handtekening. De code steunt volledig op Madoc's gateway die "al" zou hebben gevalideerd — maar:

- De backend is rechtstreeks benaderbaar van binnenuit het Docker-netwerk (andere services, toekomstige microservices, een misconfigureerde gateway-regel).
- Elk verzoek met een zelf-gefabriceerd JWT zonder geldige handtekening passeert `requireUser` en `requireSiteAdmin` ongemerkt.
- Een verlopen token met een gestolen `userId` en `site.admin`-scope werkt voor altijd als de gateway dit niet blokkeert.

Dit is een vertrouwensbeslissing die nergens gedocumenteerd is als architectuurkeuze. Als "de gateway valideert" de enige garantie is, hangt de hele autorisatielaag aan één infrastructuurconventie die niet in code zit.

**Wanneer dit explodeert:** bij de eerste intern netwerkverzoek dat de gateway omzeilt — een cron job, een migratiescript, een andere service die "even snel" iets afhandelt.

**Oplossing:** zie sectie 4.5.

---

### 1.3 De migraties hebben geen versiehistorie

`runMigrations()` voert elke tabel-aanmaak uit met `IF NOT EXISTS` in één transactie. Dit werkt voor initiële opzet. Maar er is geen migratietabel, geen versienummering, geen `ALTER TABLE`-mogelijkheid.

Wat er onvermijdelijk komt:
- Een kolom toevoegen aan `forum_topics` (bijv. een `is_pinned`-vlag).
- Een index verwijderen die te groot is geworden.
- Een `NOT NULL`-constraint versoepelen voor een nieuw optioneel veld.

Al deze wijzigingen **moeten buiten dit systeem worden uitgevoerd** — manueel via psql, met hand-coördinatie tussen deployments. Over 12 maanden is er een verzameling `ALTER TABLE`-statements in een README of Slack-thread die niemand meer weet te vinden.

**Oplossing:** zie sectie 4.2.

---

### 1.4 `getServiceJwt()` leest van schijf bij elke Madoc-aanroep

```typescript
function getServiceJwt(): string {
  const jwtJsonString = readFileSync(appConfig.madocServiceJwtPath).toString('utf-8');
  return JSON.parse(jwtJsonString).token;
}
```

`readFileSync` is een **synchrone, blokkerende** syscall. In een Node.js event-loop blokkeert dit de entire event loop voor de duur van de schijflatentie. Als `review.controller.ts` tien Madoc-aanroepen parallel triggert, zijn dat tien synchrone `readFileSync`-calls tegelijk. Onder load is dit zichtbaar als verhoogde p99-latentie voor **alle** requests, niet alleen de Madoc-proxy-requests.

De comment zegt "opzettelijk, zodat een vernieuwd token meteen actief is" — een valide reden, maar de implementatie had `fs.readFile` (async) moeten gebruiken, of een `fs.watch` die bij wijziging de cache invalideert.

**Oplossing:** zie sectie 4.6.

---

### 1.5 De `app_log`-tabel groeit voor altijd

De eigen comment zegt het al: *"Old rows are not cleaned up yet."*

Er is geen TTL, geen archivering, geen partitionering, geen cleanup-job. Over 12 maanden met een druk productiesysteem is dit een I/O-, storage- en query-performanceprobleem. De index `app_log_created_at_idx` helpt bij lezen, maar heeft geen effect op de schrijflast of tabelgrootte.

**Minimale fix:** een periodieke DELETE van rijen ouder dan 90 dagen, als pg_cron-job of als opstarttaak.

---

### 1.6 `collectAllPages()` heeft geen memory-bound

`collectAllPages()` accumuleert alle pagina's van een Madoc-lijst in één array in geheugen. Er is geen limiet op het aantal items. Als Madoc een project retourneert met 50.000 manifests verdeeld over 500 pagina's en `all=true` wordt meegestuurd, laadt de server 50.000 objecten in heap.

`tasks.controller.ts` biedt dit expliciet aan via `?all=true`. Bij een groot DiSSCo-netwerk is dit een denial-of-service vector van de eigen frontend.

**Minimale fix:** een harde limiet op het totale aantal pagina's of items, met een 413-fout als die overschreden wordt.

---

## 2. Structurele patronen & code smells

### 2.1 Het `requireX | Response`-patroon is verborgen control flow

Elke geauthenticeerde route begint met:

```typescript
const identity = requireUser(c);
if (identity instanceof Response) {
  return identity;
}
```

Dit is een discriminated union als control flow, zonder de veiligheidsnetten die echte discriminated unions bieden:

1. Het vergeten van de `instanceof Response`-check compileert zonder fout en levert een `Response`-object als `identity` mee aan de rest van de handler.
2. `requireReviewerOrAdmin` is `async` maar `requireUser` en `requireSiteAdmin` zijn synchroon — inconsistentie die de lezer dwingt te onthouden welke `await` nodig heeft.
3. Bij diepere nesting verdubbelt de boilerplate.

**Oplossing:** zie sectie 4.1.

---

### 2.2 De `madoc-db`-laag is een ongedocumenteerde coupling-bom

`StatsRepository` en `HonourBoardRepository` lezen rechtstreeks uit Madoc's interne databasetabellen: `madoc_ts.iiif_project`, `madoc_ts.iiif_derived_resource_items`, `tasks_api.tasks`. Dit zijn interne implementatiedetails van een externe service, niet een gepubliceerde interface.

- `madoc_ts.iiif_derived_resource_items` is een projectie-/cache-tabel. Als madoc-ts zijn interne caching-strategie wijzigt (naam verandert, tabel wordt gesplitst, kolom hernoemd), breekt `fetchSiteTaskTotals()` **stilzwijgend** en geeft onjuiste nulcijfers terug in plaats van een fout.
- De JSONB `context @> $1::jsonb`-check voor site-scoping in de honour board is gebaseerd op observatie van hoe madoc-ts zijn taken tagt — niet op een contractuele API.

Er is geen contracttest, geen interface-definitie van wat deze tabellen beloven, en geen alarmbel als de query opeens niets meer teruggeeft.

**Oplossing:** zie sectie 4.3.

---

### 2.3 De forum read-state heeft een TOCTOU-probleem

In `forum.controller.ts`, in de replies-handler:

```typescript
const replies = await forumRepository.listReplies(identity.siteId, topicId);
await forumRepository.markTopicSeen(identity.userId, topicId, replies.length);
```

Tussen `listReplies` en `markTopicSeen` kan een andere gebruiker een reply posten. De lezer ziet die nieuwe reply niet (hij was er al bij het laden), maar zijn `last_seen_reply_count` wordt op het hogere getal gezet. Volgend bezoek ziet hij "geen nieuwe berichten" voor een topic dat hij nooit volledig heeft gelezen.

**Fix:** de `last_seen_reply_count` direct vanuit de database zetten op basis van de actuele `COUNT(*)` op het moment van de UPDATE, niet op een eerder gelezen waarde.

---

### 2.4 `project_institution_links` is one-to-one, maar de naam suggereert many

Beide tabellen (`project_institution_links`, `project_manual_links`) hebben `PRIMARY KEY (site_id, project_slug)` — één project heeft dus maximaal één instelling en één handleiding. Maar de namen (meervoud, `*_links`) suggereren een many-to-many relatie.

Als de productowner vraagt "kan een project twee instellingen hebben?", leidt dit tot een schema-wijziging die vermijdbaar was geweest met betere naamgeving en documentatie van de werkelijke kardinaliteit.

---

### 2.5 Drie inconsistente benaderingen voor meertalige content

- `home_steps`: volledige lijst als `steps JSONB`
- `nav_items`: `content JSONB` + `intro JSONB`
- `site_theme`: losse tekstkolommen

Drie verschillende patronen voor hetzelfde probleem. Dit maakt queries op de inhoud onmogelijk, zoekopdrachten complex, en vereist dat de applicatielaag de volledige JSONB-structuur begrijpt.

---

## 3. Onvoorziene neveneffecten

### 3.1 Drie connection pools op dezelfde Postgres-instantie

```
DisscoCSDatabase:       max 20
MadocDbPools.madocTs:   max  5
MadocDbPools.tasksApi:  max  5
```

Totaal: 30 verbindingen per instantie. Postgres heeft standaard `max_connections = 100`. Als Madoc's eigen services ook elk een pool hebben, en dit systeem op één Postgres-instantie draait, kan de verbindingslimiet bereikt worden bij meerdere replica's. Bij 3 replica's van DiSSCo CS alleen al: 90 verbindingen.

---

### 3.2 `clearJwt()` in de frontend heeft een hardgecodeerde path-scope

```typescript
document.cookie = `madoc/${slug}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/s/${slug}`;
```

Als het originele cookie door Madoc ooit met een andere `path` werd gezet (bijv. `path=/`), verwijdert deze code het niet. De frontend denkt uitgelogd te zijn, maar de browser stuurt het originele cookie nog mee op requests — een situatie waarbij de frontend denkt uitgelogd te zijn maar browser-requests nog steeds geauthenticeerd zijn.

---

### 3.3 `recordVisit()` bij elke paginalaad is een onthrottled write

```typescript
// main.tsx
recordVisit();
```

Bij elke SPA-reload, tab open of Ctrl+R wordt `POST /api/dissco-cs/user-profile/visit` aangeroepen, wat een `INSERT ... ON CONFLICT DO UPDATE` naar `user_profile` doet. Er is geen debouncing, geen server-side throttling, geen check of het bezoek "recent" al geregistreerd was. Bij een grotere deployment begint dit merkbaar bij te dragen aan write-amplification.

---

### 3.4 Naam-kopieën in forum en feedback zijn stilzwijgend inconsistent

`author_name` in `forum_topics`, `forum_replies`, `feedback_threads` en `feedback_messages` is een kopie van de naam op het moment van schrijven, gesynchroniseerd via `POST /user-profile/sync-name`. Maar:

- De sync is optioneel en initiatiefnemer-gestuurd.
- Al geposte berichten worden nooit bijgewerkt.
- `feedback_threads.reviewer_name` en `recipient_name` worden ook nooit bijgewerkt na aanmaak.

Na een naamswijziging ziet een gebruiker hun oude naam in oude threads, hun nieuwe naam in nieuwe threads. Over 12 maanden, als een medewerker van naam verandert en klaagt over inconsistente weergave, is er geen eenvoudige fix zonder bulk-update.

---

## 4. "I would have done this differently"

### 4.1 Authenticatie als Hono middleware, niet als return-type

Het huidige `requireX | Response`-patroon vervangen door middleware die de identity in `c.var` injecteert:

```typescript
// middleware/auth.middleware.ts
export const authenticated = createMiddleware<{ Variables: { identity: MadocUserIdentity } }>(
  async (c, next) => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) return c.json({ error: 'Unauthorized' }, 401);
    c.set('identity', identity);
    await next();
  }
);

export const adminOnly = createMiddleware<{ Variables: { identity: MadocUserIdentity } }>(
  async (c, next) => {
    const identity = c.var.identity;
    if (!identity.scope.includes('site.admin')) return c.json({ error: 'Forbidden' }, 403);
    await next();
  }
);
```

Routes worden dan:

```typescript
app.get('/topics', authenticated, async c => {
  const identity = c.var.identity; // altijd typed, nooit null, geen instanceof-check
  ...
});
```

Dit elimineert de ~8 regels boilerplate per route, maakt de autorisatiebedoeling zichtbaar op route-niveau, en is volledig type-safe.

---

### 4.2 Een echte migratiestrategie

`node-pg-migrate` of equivalent inzetten. Het geeft:
- Een `schema_migrations`-tabel met versienummers.
- Forward-only migraties (geen up/down — down-migraties zijn een illusie voor productiedatabases).
- `ALTER TABLE`-mogelijkheid zonder handmatige coördinatie.
- Reproductie van de exacte productiestaat in de testomgeving.

De huidige `runMigrations()` kan behouden blijven als "migratie 0001", en alle toekomstige wijzigingen worden nieuwe genummerde bestanden.

---

### 4.3 Een contract voor de madoc-db-laag

De directe DB-koppeling aan madoc-ts' interne tabellen omgeven met expliciete contracttests die bij startup valideren dat de verwachte tabellen en kolommen bestaan:

```typescript
async function validateMadocDbContract(pool: Pool, schema: string): Promise<void> {
  const checks = [
    `SELECT assignee_id, assignee_name, status, type, context, root_task,
            created_at, modified_at FROM ${schema}.tasks LIMIT 0`,
    `SELECT id, task_id, status, collection_id FROM ${schema}.iiif_project LIMIT 0`,
  ];
  for (const check of checks) {
    await pool.query(check); // gooit als kolommen ontbreken
  }
}
```

Dit maakt een madoc-ts-upgrade die de tabelstructuur wijzigt onmiddellijk zichtbaar bij startup, in plaats van stille nulcijfers drie weken later.

---

### 4.4 SwrCache met een pluggable store

```typescript
interface CacheStore<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V, expiresAt: number): void;
}

class SwrCache<K, V> {
  constructor(
    private readonly label: string,
    private readonly ttlMs = 0,
    private readonly store: CacheStore<K, V> = new MemoryStore()
  ) {}
}
```

In productie met meerdere replica's kan dan een `RedisStore` worden ingeplugd zonder gedragsverandering. In tests en single-instance deployments werkt de `MemoryStore`.

---

### 4.5 JWT-verificatie toevoegen

```typescript
import { jwtVerify, importSPKI } from 'jose';

// Public key eenmalig gelezen bij startup
const madocPublicKey = await importSPKI(readFileSync(appConfig.madocPublicKeyPath, 'utf-8'), 'RS256');

export async function verifiedPayload(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, madocPublicKey, { clockTolerance: 30 });
    return payload;
  } catch {
    return null;
  }
}
```

Dit voegt geen overhead toe op het gateway-pad (die al valideert), maar maakt de backend weerbaar tegen requests die de gateway omzeilen.

---

### 4.6 `getServiceJwt()` asynchroon met file-watching

```typescript
let cachedToken: string | null = null;

export function initServiceJwtWatcher(): void {
  watch(appConfig.madocServiceJwtPath, () => {
    cachedToken = null; // invalideer bij wijziging
  });
}

export async function getServiceJwt(): Promise<string> {
  if (!cachedToken) {
    const raw = await readFile(appConfig.madocServiceJwtPath, 'utf-8');
    cachedToken = JSON.parse(raw).token;
  }
  return cachedToken!;
}
```

Één async read per token-levensduur in plaats van één synchrone blokkerende read per Madoc-aanroep, zonder de originele motivatie ("vernieuwd token is meteen actief") te verliezen.

---

## Samenvatting: prioritering

| # | Risico | Impact | Complexiteit |
|---|--------|--------|--------------|
| 1.2 | Geen JWT-verificatie | Hoog (security) | Laag |
| 1.3 | Geen migratiestrategie | Hoog (evolutie) | Laag |
| 1.4 | `readFileSync` in hot path | Middel (latentie) | Laag |
| 1.1 | SwrCache niet schaalbaar | Hoog bij schaling | Middel |
| 2.2 | Direct madoc-DB-koppeling | Hoog bij madoc-upgrade | Middel |
| 1.5 | `app_log` groeit onbeperkt | Middel (operations) | Laag |
| 3.2 | `clearJwt()` scope mismatch | Laag–middel (security) | Laag |
| 3.3 | `recordVisit()` onthrottled | Laag nu, groeit | Laag |
| 2.1 | `requireX \| Response`-patroon | Laag (leesbaarheid) | Middel |

De drie items met de hoogste impact/complexiteit-ratio zijn **1.2** (JWT-verificatie), **1.3** (migratiestrategie) en **1.4** (service JWT async maken). Ze zijn elk een middag werk en elimineren risico's die anders over 12 maanden als incident terugkomen.
