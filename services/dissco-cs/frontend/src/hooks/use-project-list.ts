import { useQuery } from '@tanstack/react-query';
import { getSiteProjects } from '../api/madoc-client/projects';

export function useProjectList(page = 1, options: { published?: boolean } = {}) {
  return useQuery({
    queryKey: ['site-projects', page, options.published],
    queryFn: () => getSiteProjects({ page, ...options }),
    staleTime: 0,
  });
}
