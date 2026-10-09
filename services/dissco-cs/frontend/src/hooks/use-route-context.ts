import { useParams } from 'react-router-dom';

export type RouteContext = {
  projectSlug?: string;
  manifestId?: number;
  canvasId?: number;
};

export function useRouteContext(): RouteContext {
  const { slug, manifestId, canvasId } = useParams<{ slug?: string; manifestId?: string; canvasId?: string }>();

  return {
    projectSlug: slug,
    manifestId: manifestId ? Number(manifestId) : undefined,
    canvasId: canvasId ? Number(canvasId) : undefined,
  };
}
