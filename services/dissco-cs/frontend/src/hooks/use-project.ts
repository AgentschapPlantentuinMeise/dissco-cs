import { useQuery } from 'react-query';
import { getSiteProject } from '../api/madoc-client/projects';
import { useRouteContext } from './use-route-context';

export function useProject() {
  const { projectId } = useRouteContext();
  return useQuery(['project', projectId], () => getSiteProject(projectId!), {
    enabled: !!projectId,
  });
}
