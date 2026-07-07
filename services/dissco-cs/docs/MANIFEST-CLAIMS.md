# Manifest claims & "wie heeft dit open" zichtbaarheid

Documentatie van hoe een citizen-science manifest "geclaimd" wordt door een gebruiker, hoe dat
weer terug ongedaan gemaakt wordt, en hoe `ProjectDetail.tsx` daarmee bepaalt welke manifesten in
"Choose where to start" getoond mogen worden. Bedoeld als referentie voor toekomstige aanpassingen
aan dit gedrag (bv. canvas-granulariteit, andere project-templates, multi-contributor projecten).

## Het probleem dat dit oplost

Een manifest mag niet door twee gebruikers tegelijk geselecteerd worden in de "Choose where to
start"-grid. Zodra gebruiker A een manifest opent, moet het voor gebruiker B verdwijnen uit die
grid — maar als A niets opslaat en de pagina verlaat, moet het manifest weer beschikbaar komen
voor iedereen (inclusief A zelf).

## De onderliggende bouwstenen (Madoc-kern, niet aanpassen)

Madoc heeft per manifest twee soorten taken (`crowdsourcing-task` objecten in de task-API):

1. **De gedeelde "manifest-task"** (`type: 'crowdsourcing-manifest-task'`) — één per manifest,
   gedeeld door alle gebruikers. Status verandert alleen automatisch als
   `maxContributionsPerResource` in de projectconfiguratie is ingesteld
   (`gateway/tasks/crowdsourcing-manifest-task.ts`, functie `syncManifestTaskStatus`). Zodra het
   aantal actieve per-gebruiker taken het maximum bereikt, springt deze naar status `2` ("max
   contributors"), wat zich vertaalt naar resource-status `1` ("in progress") — zie
   `mapProjectTaskStatus` in `utility/resource-status.ts`.
2. **De eigen taak van een gebruiker** (`type: 'crowdsourcing-task'`, `assignee` = die gebruiker)
   — aangemaakt zodra iemand het manifest claimt (`api.createResourceClaim`).

**Cruciale projectinstelling: `maxContributionsPerResource`.** Voor dit project ("Herbarium
sheets poging 2") staat dit op `'1'`. Zonder deze instelling (onbeperkt aantal bijdragers) blijft
de gedeelde manifest-task altijd op status `0` staan, en heeft de rest van dit document **geen
effect** — er is dan geen signaal beschikbaar dat verraadt dat iemand een manifest open heeft
staan, zonder een aanvullende backend-aanpassing. Check dit altijd eerst bij nieuwe projecten die
dit gedrag nodig hebben.

## Hoe `ProjectDetail.tsx` manifesten verbergt

`apiHooks.getSiteCollection(...)` wordt aangeroepen met `hide_status: '1,2,3'` (niet `'2,3'`).
De server (`routes/site/site-collection.ts`, **niet aanpassen, is upstream**) berekent voor elk
manifest een gecombineerde status (0=vrij, 1=in progress, 2=ingediend, 3=afgerond) op basis van
bovenstaande twee taken, en sluit manifesten waarvan de status in `hide_status` voorkomt al
**server-side** uit `collection.items`. Daarom is er in `ProjectDetail.tsx` geen client-side
filterlogica meer nodig:

```ts
const manifests = notStartedCollection?.collection?.items ?? [];
```

**Let op bij debuggen:** de losse status-array komt terug als `notStartedCollection.subjects`,
**niet** als `notStartedCollection.collection.subjects`.

### Waarom dit eerder niet werkte (en niet meer mag terugkomen)

Een eerdere poging filterde client-side op basis van `api.getTasks({ all_tasks: true, ... })`,
rechtstreeks vanuit de browser aangeroepen. Dit **werkt niet voor gewone contributors** (zonder
`tasks.admin`/`site.admin`-scope): die krijgen via de publieke task-API nooit de taken van andere
gebruikers terug, dus de filter had niets om op te filteren. Gebruik daarom altijd de
server-side berekende status uit `getSiteCollection` (die draait met `siteApi`, geprivilegieerde
toegang), niet een rechtstreekse `getTasks`-call vanuit de frontend.

## Hoe een claim weer ongedaan gemaakt wordt (abandon)

`FloatingEditor.tsx` (de editor-pagina voor manifest-granulariteit projecten) zet bij het
verlaten van de pagina de eigen taak op status `-1` ("abandoned") als er niets bewaard is:

```ts
const { updateClaim, canContribute, preventFurtherSubmission, userTasks } = useManifestUserTasks();
const claimIdRef = useRef<string | undefined>(undefined);

useEffect(() => {
  const id = userTasks?.[0]?.id;
  if (id) claimIdRef.current = id;
}, [userTasks]);

useEffect(() => {
  return () => {
    const claimId = claimIdRef.current;
    if (!hasSaved.current && claimId) {
      api.updateTask(claimId, { status: -1, status_text: 'abandoned' } as any)
        .then(() => {
          queryCache.invalidateQueries('getSiteCollection');
          queryCache.invalidateQueries('crowdsourcing-active-tasks');
        });
    }
  };
}, []);
```

Status `-1` wordt door `isActiveTaskStatus()` (`utility/resource-status.ts`) als "niet actief"
behandeld, dus zo'n taak telt niet meer mee in de gecombineerde status → het manifest komt vanzelf
weer tevoorschijn in `ProjectDetail.tsx`, voor iedereen inclusief de gebruiker die het abandoned.

### De bug die we gefixt hebben — en waar opnieuw op te letten

`claimIdRef` werd voorheen gevuld vanuit `(projectModel as any)?.claim?.id`, waarbij
`projectModel` afkomstig was van `usePreparedManifestModel()` → `useManifestModel()` →
`api.getSiteProjectManifestModel(...)`. **Die server-route geeft enkel `{ model }` terug, nooit
een `claim`-veld** (zie `gateway/api.ts`, `getSiteProjectManifestModel`). Resultaat: `claimIdRef`
bleef altijd `undefined`, de abandon-call vuurde nooit, en elk ooit-geopend manifest bleef voor
altijd "in progress" staan — onzichtbaar voor iedereen, voor altijd.

De juiste bron voor het taak-ID is `useManifestUserTasks().userTasks` — dat komt via
`useProjectManifestTasks()` van de route `routes/site/site-manifest-tasks.ts`, die het
`userTasks`-veld (de eigen, actieve taken van de huidige gebruiker op dit manifest) wél correct
vult.

**Als je dit ooit opnieuw aanpast:** controleer altijd of het veld waaruit je het taak-ID haalt
ook echt door de bijhorende server-route gevuld wordt. `console.log` het tussenresultaat voordat
je aanneemt dat een hook-return-waarde "vanzelf" het juiste ID bevat — deze hele bug bestond
omdat niemand dat ooit had gecontroleerd.

## Checklist voor nieuwe scenario's

- **Canvas-granulariteit projecten** (`claimGranularity: 'canvas'`) gebruiken
  `TranscriptionEditor.tsx` + `useCanvasUserTasks()`, niet `FloatingEditor.tsx`. Die heeft
  **geen** abandon-on-unmount logica — als canvas-niveau verberging ooit nodig is, moet dat daar
  apart toegevoegd worden, met hetzelfde patroon (`userTasks?.[0]?.id` als bron, niet
  `projectModel.claim`).
- **`maxContributionsPerResource` moet ingesteld zijn** (meestal op `1`) wil dit mechanisme
  überhaupt iets verbergen. Geen limiet = geen signaal = niets om te verbergen, zonder
  aanvullende backend-route.
- **Al vastzittende test-taken** (aangemaakt vóór deze fix, nooit afgesloten) lossen zichzelf niet
  op — die moeten manueel via de admin-taken-lijst van het project op een niet-actieve status
  gezet worden.
- Wijzig nooit `routes/site/site-collection.ts` of andere upstream route-bestanden voor dit
  gedrag — alle aanpassingen horen binnen `frontend/site/citizen-science/` te blijven.
