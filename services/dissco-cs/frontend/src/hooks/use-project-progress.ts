import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/cs-client/projects';
import { projectQueries } from '../api/queries/projects';

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

// staleTime 0: every page or card that shows the progress fetches it fresh, instead of showing
// data up to 60 s old after a submit or accept elsewhere in the app. refetchOnWindowFocus is off:
// otherwise every focus switch would repeat it, once per visible card, without anything changed.
export function useProjectProgress(projectId: number | string | undefined) {
  const controllerRef = useRef<AbortController | null>(null);

  // Unmounting (e.g. a page change) or a new projectId cancels this card's own request: a request
  // still waiting leaves the queue right away, a running one is aborted.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, [projectId]);

  // Key from the shared factory (so invalidating projectKeys.progress/all reaches this card), but
  // its own queryFn: the request goes through the module-level queue above.
  return useQuery({
    ...projectQueries.progress(projectId),
    queryFn: () => {
      controllerRef.current = new AbortController();
      return runQueued(signal => projectsApi.getProgress(projectId!, signal), controllerRef.current.signal);
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
