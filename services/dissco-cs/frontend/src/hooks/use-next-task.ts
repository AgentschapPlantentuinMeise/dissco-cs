import { useMutation } from '@tanstack/react-query';
import { projectsApi } from '../api/cs-client/projects';
import { useCurrentProject } from './use-current-project';
import { disscoCSConfig } from '../dissco-cs-config';



// Tasks in this project are handed out at random (see ProjectDetail's "Start" button, which calls
// the same endpoint) rather than worked through in a fixed order — so "next task" has to ask for
// another random assignment, not walk to the next manifest in the collection's listing order.
export function useNextTask() {
  const { data: project } = useCurrentProject();

  const { mutateAsync: requestNextUrl, isPending: isLoadingNext } = useMutation({
    mutationFn: async (): Promise<string | null> => {
      if (!project) return null;
      const result = await projectsApi.randomManifest(project.slug);
      return result?.manifest ? `/explore/${project.slug}/manifests/${result.manifest}/annotate` : null;
    },
  });

  return { requestNextUrl, isLoadingNext };
}
