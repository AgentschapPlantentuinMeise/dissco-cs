import { useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { projectProgressApi, ProjectProgress } from '../api/cs-api';

// Caps how many /progress requests are in flight at once -- each one triggers several downstream
// Madoc/DB calls, so a full page of ProjectCards firing them all simultaneously can exhaust
// Postgres's connection limit. Module-level so every card and ProjectDetail share one queue.
const MAX_CONCURRENT = 4;
let active = 0;
const waiting: Array<() => void> = [];

function runQueued<T>(task: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const attempt = () => {
      active++;
      task(signal)
        .then(resolve, reject)
        .finally(() => {
          active--;
          const nextAttempt = waiting.shift();
          if (nextAttempt) nextAttempt();
        });
    };

    if (active < MAX_CONCURRENT) {
      attempt();
      return;
    }

    let queued: () => void;
    const onAbort = () => {
      const idx = waiting.indexOf(queued);
      if (idx !== -1) waiting.splice(idx, 1);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    queued = () => {
      signal.removeEventListener('abort', onAbort);
      attempt();
    };
    signal.addEventListener('abort', onAbort, { once: true });
    waiting.push(queued);
  });
}

// staleTime: 0 zodat elke pagina/kaart die de voortgang toont bij het tonen altijd een verse
// stand ophaalt, i.p.v. tot 60s oude data te tonen na een submit/accept elders in de app.
// refetchOnWindowFocus staat uit: anders herhaalt dat bij elke focus-wissel, vermenigvuldigd
// per zichtbare kaart, zonder dat er iets veranderd is.
export function useProjectProgress(projectId: number | string | undefined) {
  const controllerRef = useRef<AbortController | null>(null);

  // Unmount (bv. bij paginawissel) of gewijzigd projectId annuleert deze kaart z'n eigen call --
  // nog-niet-gestarte calls verlaten meteen de wachtrij, lopende calls worden echt geannuleerd.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, [projectId]);

  return useQuery<ProjectProgress>(
    ['project-progress', projectId],
    () => {
      controllerRef.current = new AbortController();
      return runQueued(signal => projectProgressApi.get(projectId!, signal), controllerRef.current.signal);
    },
    { enabled: !!projectId, staleTime: 0, refetchOnWindowFocus: false, retry: 1 }
  );
}
