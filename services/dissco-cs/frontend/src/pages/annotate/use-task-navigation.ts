import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNextTask } from './use-next-task';

// Moving between tasks. Leaving always releases the claim first (see use-task-claim), so the next
// page never races the release.
export function useTaskNavigation({
  projectSlug,
  manifestId,
  releaseClaim,
}: {
  projectSlug: string | undefined;
  manifestId: number | undefined;
  releaseClaim: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const { requestNextUrl, isLoadingNext } = useNextTask();
  // Tasks are handed out randomly, not in a fixed sequence, so "previous" can only mean "the
  // manifest I was on before" — tracked here as a simple visited stack, not derived from any list.
  const [visited, setVisited] = useState<number[]>([]);

  const handleLeave = async (to: string) => {
    await releaseClaim();
    navigate(to);
  };

  // Asks for another random assignment (same endpoint as ProjectDetail's "Start" button) and goes
  // there — falling back to the project page once none are left. Records the manifest we're
  // leaving so "Vorige taak" has somewhere to go back to.
  const goToNext = async () => {
    // A failed lookup lands on the project page, same as when no tasks are left.
    const url = await requestNextUrl(undefined).catch(() => null);
    if (manifestId) setVisited(v => [...v, manifestId]);
    await handleLeave(url ?? `/explore/${projectSlug}`);
  };

  const goToPrevious = async () => {
    const prevManifestId = visited[visited.length - 1];
    if (prevManifestId === undefined) return;
    setVisited(v => v.slice(0, -1));
    await handleLeave(`/explore/${projectSlug}/manifests/${prevManifestId}/annotate`);
  };

  return { handleLeave, goToNext, goToPrevious, canGoPrevious: visited.length > 0, isLoadingNext };
}
