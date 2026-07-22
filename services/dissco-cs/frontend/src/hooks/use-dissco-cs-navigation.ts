import { useMutation } from 'react-query';
import { madocClient } from '../api/madoc-client';
import { useProject } from './use-project';
import { disscoCSConfig } from '../dissco-cs-config';



// Tasks in this project are handed out at random (see ProjectDetail's "Start" button, which calls
// the same endpoint) rather than worked through in a fixed order — so "next task" has to ask for
// another random assignment, not walk to the next manifest in the collection's listing order.
export function useDisscoCSNavigation() {
  const { data: project } = useProject();

  const [requestNextUrl, { isLoading: isLoadingNext }] = useMutation(async (): Promise<string | null> => {
    if (!project) return null;
    const result = await madocClient.randomlyAssignedManifest(project.slug, {});
    return result?.manifest ? `/explore/${project.slug}/manifests/${result.manifest}/annotate` : null;
  });

  return { requestNextUrl, isLoadingNext };
}
