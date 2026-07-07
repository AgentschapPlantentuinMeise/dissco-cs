import { useParams } from 'react-router-dom';

export type RouteContext = {
  projectId?: string;
  manifestId?: number;
  canvasId?: number;
};

export function useRouteContext(): RouteContext {
  const { slug, manifestId, canvasId } = useParams<{ slug?: string; manifestId?: string; canvasId?: string }>();

  return {
    projectId: slug,
    manifestId: manifestId ? Number(manifestId) : undefined,
    canvasId: canvasId ? Number(canvasId) : undefined,
  };
}
