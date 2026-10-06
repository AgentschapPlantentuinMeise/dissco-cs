import { useQuery } from '@tanstack/react-query';
import { getSiteProject } from '../api/madoc-client/projects';
import { useRouteContext } from './use-route-context';

export function useProject() {
  const { projectId } = useRouteContext();
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getSiteProject(projectId!),
    enabled: !!projectId,
  });
}
