# UserDashboard — hoe de cijfers berekend worden

Documentatie van de afleidingsketen achter de statistieken in `UserDashboard.tsx`
("Saved"/"Completed"-tabblad, donut chart, kerncijfers "Contributions"/"Completed"/"Projects",
participatiezin). Bedoeld als referentie voor toekomstige aanpassingen, naar het patroon van
`MANIFEST-CLAIMS.md` in de map hierboven. Deze cijfers zijn **niet** een rechtstreekse weergave
van de ruwe task-API-data: er moet gecorrigeerd worden voor een aantal eigenaardigheden van de
onderliggende Madoc task-structuur, en een aantal van die correcties zijn pas tijdens latere
debug-sessies ontdekt (zie sectie "Bugs die hier al gefixt zijn").

## Databronnen

Drie queries voeden de hele pagina:

- **`my-tasks`** — `api.getTasks` met `assignee: urn:madoc:user:<id>`, `all_tasks: true`,
  `detail: true`, `per_page: 100`. Dit is de basis voor alle berekeningen hieronder (`tasksData.tasks`).
- **`site-projects-dashboard`** — `api.getSiteProjects()` → omgezet naar `projectMap`
  (`root_task-id → project slug`), gebruikt om in de tabel de projectnaam te tonen en de
  taak-link op te bouwen (`buildTaskLink`).
- **`site-tasks-total`** — `api.getTasks(..., status: 3)` met `per_page: 1`, enkel om
  `pagination.totalResults` (= `siteTotal`, totaal aantal afgeronde taken op de hele site) op te
  vragen voor het percentage.

## Task-statussen (Madoc `crowdsourcing-task`)

| status | betekenis | waar gezet |
|---|---|---|
| `0` | Automatisch aangemaakt zodra een gebruiker een manifest/canvas **opent**, vóór er iets is opgeslagen. Geen echte bijdrage. | `use-prepared-manifest-model.ts` / `use-prepared-canvas-model.ts` → `useClaimManifest` → `api.createResourceClaim(..., { status: 0 })` |
| `1` | "In progress"/draft — de gebruiker heeft effectief een draft opgeslagen. | `useManifestUserTasks().updateClaim`, wanneer `revision.status === 'draft'` ([use-manifest-user-tasks.ts:23-30](../../../hooks/use-manifest-user-tasks.ts#L23-L30)) |
| `2` | "Submitted"/in review. | zelfde hook, wanneer `revision.status === 'submitted'` ([use-manifest-user-tasks.ts:35-44](../../../hooks/use-manifest-user-tasks.ts#L35-L44)) |
| `3` / `5` | Afgerond/geaccepteerd. | server-side (review-flow) |
| `-1` | Rejected/abandoned. | o.a. de abandon-on-unmount logica in `FloatingEditor.tsx` (zie `MANIFEST-CLAIMS.md`) wanneer een gebruiker een manifest opent maar niets bewaart |

**Status `0` en `-1` tellen niet mee als bijdrage** in dit dashboard — dat is de eerste correctie
in de afleidingsketen hieronder.

## De afleidingsketen: van ruwe `tasks` naar wat je ziet

```
tasks (ruw, uit my-tasks query)
  → uniqueTasks   (dedup op id)
  → realTasks     (status !== 0 && status !== -1)
  → visibleTasks  (dedupliceer manifest/canvas-dubbels van dezelfde bijdrage)
      → savedTasks (status === 1)
      → doneTasks  (status === 2 || 3 || 5)
```

1. **`uniqueTasks`** — dedup op `id`, omdat de task-API soms dubbels teruggeeft.

2. **`realTasks`** — sluit status `0` (lege auto-claim) en `-1` (rejected/abandoned) uit. Dit is
   de fix voor het probleem *"elk geopend manifest telt mee als contribution"*: voordien werd
   status `0` mee weergegeven in het "Saved"-tabblad, simpelweg omdat het openen van een manifest
   al automatisch zo'n taak aanmaakt — zonder dat de gebruiker iets had ingevuld.

3. **`visibleTasks`** — dedupliceert **dezelfde bijdrage die op twee granulariteitsniveaus
   voorkomt**. Eén submissie kan zowel als manifest-taak (`subject = urn:madoc:manifest:X`, geen
   `subject_parent`) als canvas-taak (`subject = urn:madoc:canvas:Y`, `subject_parent` = dat
   manifest) in de resultset staan. Canvas-niveau heeft voorrang: de manifest-taak wordt verborgen
   zodra er een **echte** (`realTasks`) canvas-taak voor datzelfde manifest bestaat:

   ```ts
   const visibleTasks = realTasks.filter(t => {
     const parsed = t.subject ? parseUrn(t.subject) : null;
     if (parsed?.type === 'manifest' && !t.subject_parent) {
       return !realTasks.some(other => other.subject_parent === t.subject);
     }
     return true;
   });
   ```

   Dit loste een concrete, in een debug-sessie geobserveerde dubbeltelling op: "Freesia refracta"
   stond zowel als `manifest:3` (status 1) als `canvas:4` (status 1) in de ruwe lijst — één
   bijdrage, twee keer geteld in "Contributions".

### Bug die hier al gefixt is — let hier opnieuw op bij wijzigingen

De oude `doneTasks`-filter verstopte een canvas-taak zodra **ook maar één** manifest-taak voor
diezelfde manifest bestond, **inclusief een inerte status-0 auto-claim**:

```ts
// FOUTIEVE oude logica — niet terugbrengen
if (parsed?.type === 'canvas' && t.subject_parent) {
  return !uniqueTasks.some(other => other.subject === t.subject_parent && !other.subject_parent);
}
```

Hierdoor verdween een écht voltooide canvas-taak (`Limonium coincyi`, status 2) onterecht uit het
"Completed"-tabblad — terwijl hij wél meetelde in het totaal "Contributions". Reden: de check
gebeurde tegen `uniqueTasks` (alles, incl. status 0), niet tegen `realTasks` (enkel echte taken).
**De huidige `visibleTasks`-logica checkt daarom bewust enkel tegen `realTasks`.** Als je deze
dedup-logica ooit herschrijft: test altijd tegen een situatie waarin er zowel een status-0
manifest-claim als een afgewerkte canvas-taak voor hetzelfde manifest bestaan.

## Van `visibleTasks` naar de UI

| variabele | bron | gebruikt voor |
|---|---|---|
| `savedTasks` | `visibleTasks` met status `1` | "Saved tasks"-tabblad, donut-segment "draft" |
| `doneTasks` / `doneCount` | `visibleTasks` met status `2`/`3`/`5` | "Completed tasks"-tabblad, donut-segment "done" |
| `contributedTasks` | `= visibleTasks` | kerncijfer "Contributions" (`my_tasks_total`) |
| `projectRootTaskIds` / `projectCount` | unieke `root_task`-ids over `contributedTasks` | kerncijfer "Projects", participatiezin |
| `userDoneCount` | status `3` op **`uniqueTasks`** (bewust niet gededupliceerd — pure teller) | teller in `percentage`-berekening |
| `percentage` | `userDoneCount / siteTotal` | `"You have completed X% of the total contributions"` |

**Bekende makke (open punt, niet volledig opgelost):** `projectCount` telt unieke `root_task`-ids
ongeacht of dat project nog bestaat in `projectMap`. Als `root_task` niet correct gevuld is door
de task-API (in de praktijk soms `null` gebleken op deze taken) of als het project intussen
verwijderd is, klopt dit cijfer mogelijk niet meer en/of toont de tabel `—` in de PROJECT-kolom
(`buildTaskLink`/`TaskTable` kunnen dan geen projectslug bepalen). Niet proberen op te lossen door
op iets anders dan `root_task` te matchen zonder dat eerst via de console-logging te bevestigen.

## Debug-logging

De `console.log('[UserDashboard] ...')`-regels in het component (rond het begin van de
component-body, tussen het ophalen van `tasks` en de render) staan er **bewust**, niet als
vergeten debug-restjes:

- ruwe `tasks`-telling en per-taak status/root_task
- welke taken uitgesloten worden wegens status `0` of `-1`, en welke wegens manifest/canvas-dedup
- de uiteindelijke `visibleTasks`, `savedTasks`, `doneTasks`
- de `root_task`-ids achter `projectCount`, en welke daarvan **niet** in `projectMap` voorkomen
  (signaal voor een verwijderd of onbekend project)

Deze logging is gedetailleerd omdat eerdere discrepanties in deze cijfers (dubbeltellingen,
verdwenen taken) enkel via deze output teruggevonden konden worden. **Niet zomaar verwijderen** als
"opruimwerk" — als de logging niet meer nodig blijkt, overweeg dan eerder ze achter een
debug-vlag te zetten dan ze volledig weg te halen.

## Checklist voor toekomstige aanpassingen

- Nieuw task-statusnummer/scenario? Pas zowel `realTasks`/`visibleTasks` als dit document aan.
- `root_task` structureel leeg? Dat is een server/API-probleem, geen frontend-bug — bevestig dat
  eerst via de console-logging voordat je elders gaat matchen.
- Wijzig nooit de upstream claim-flow (`use-prepared-manifest-model.ts`, `use-claim-manifest.ts`,
  `routes/projects/create-resource-claim.ts`) om dit dashboard-gedrag te beïnvloeden — alle
  correcties horen in `UserDashboard.tsx` zelf te gebeuren (fork-isolatie, zie ook
  `MANIFEST-CLAIMS.md`).
