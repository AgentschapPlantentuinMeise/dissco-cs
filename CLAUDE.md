# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.


## Verplichte aankondiging voor elke code-aanpassing

Voordat je ENIGE file aanpast (edit, create, delete) — ook bij kleine fixes — 
schrijf je eerst, als gewone tekst in je antwoord, dit blokje:

**Probleem:** [wat is er kapot/ontbrekend, in 1-2 zinnes, concreet — geen 
herhaling van de user-vraag maar de technische oorzaak die je hebt gevonden]
**Aanpak:** [welke file(s), welke functie/regel, wat verandert er]
**Risico:** [wat zou er kunnen breken, of "geen" als je dat zeker weet]

Pas NA dit blokje mag je de edit-tool aanroepen. Dit geldt voor elke 
aanpassing, ook losse one-liners. Geen plan mode, geen apart bestand — 
gewoon deze 3 regels inline in je antwoord, elke keer opnieuw.

Als je dit blokje overslaat, is dat een fout — corrigeer het direct zodra 
het wordt opgemerkt.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. TypeScript Practice

- Do prefer explicit interfaces/types for domain entities
- Do use discriminated unions for complex states
- Do use `type` for unions and simple aliases
- Do use `interface` for object shapes and classes
- Do avoid `any` type (use `unknown` if type is truly unknown)
- Don't use implicit types or `any`

## 6. React & Hooks Best Practices

- Do keep hook signatures focused on a single domain
- Do use `React.memo()` for expensive components
- Do use `useMemo()` and `useCallback()` for expensive calculations
- Do expose imperative handlers via callbacks rather than mutating shared state
- Do memoize expensive computations to align with performance expectations
- Do prefer composition over prop drilling
- Don't mutate state directly
- Don't store derived values in state (calculate on render instead)

Ignore TS-fouten nodemodules is not installed in this project

Keep in mind that the structure en code we provide is in a open source context 

## Rules for my fork: Surgical Changes
- **Scope:** "Upstream" in deze sectie betekent uitsluitend `services/madoc-ts` (Digirati's Madoc-code). Deze surgical/no-refactor-regels gelden NIET voor `services/dissco-cs` — dat is onze eigen, custom service. Daar geldt gewoon: doe wat de user vraagt, geen extra terughoudendheid.
- **Touch only what you must:** Wijzig alleen de specifieke bestanden die direct nodig zijn voor jouw aftakking. Laat upstream (`services/madoc-ts`) code intact.
- **Geen upstream refactoring:** Ruim geen oude code, comments of 'dead code' op in originele upstream (`services/madoc-ts`) bestanden.
- **Isoleren van features:** Probeer nieuwe Madoc-features in een aparte map te bouwen in plaats van bestaande `services/madoc-ts`-bestanden te overschrijven — `services/dissco-cs` is al die aparte map.


# Claude Code Richtlijnen
- Start alleen een subagent als een taak strikt parallelle verwerking of diepgaand onderzoek in meerdere mappen vereist.
- Voer routinematige code-aanpassingen, tests en bestandswijzigingen rechtstreeks uit in de hoofdsessie.



