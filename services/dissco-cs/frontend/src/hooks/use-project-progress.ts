import { useQuery } from 'react-query';
import { projectProgressApi, ProjectProgress } from '../api/cs-api';

// staleTime: 0 zodat elke pagina/kaart die de voortgang toont bij het tonen altijd een verse
// stand ophaalt, i.p.v. tot 60s oude data te tonen na een submit/accept elders in de app.
// refetchOnWindowFocus staat uit: anders herhaalt dat bij elke focus-wissel, vermenigvuldigd
// per zichtbare kaart, zonder dat er iets veranderd is.
export function useProjectProgress(projectId: number | string | undefined) {
  return useQuery<ProjectProgress>(
    ['project-progress', projectId],
    () => projectProgressApi.get(projectId!),
    { enabled: !!projectId, staleTime: 0, refetchOnWindowFocus: false }
  );
}
