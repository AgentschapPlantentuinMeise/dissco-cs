import { useQuery } from 'react-query';
import { projectProgressApi, ProjectProgress } from '../api/cs-api';

// staleTime: 0 zodat elke pagina/kaart die de voortgang toont bij het tonen altijd een verse
// stand ophaalt, i.p.v. tot 60s oude data te tonen na een submit/accept elders in de app.
export function useProjectProgress(projectId: number | string | undefined) {
  return useQuery<ProjectProgress>(
    ['project-progress', projectId],
    () => projectProgressApi.get(projectId!),
    { enabled: !!projectId, staleTime: 0 }
  );
}
