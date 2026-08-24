import { useQuery } from 'react-query';
import { getSiteProjects } from '../api/madoc-client/projects';

export function useProjectList(page = 1, options: { published?: boolean } = {}) {
  return useQuery(['site-projects', page, options.published], () => getSiteProjects({ page, ...options }), {
    staleTime: 0,
  });
}
