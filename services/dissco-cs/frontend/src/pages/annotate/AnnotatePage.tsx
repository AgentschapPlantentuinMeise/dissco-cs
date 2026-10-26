import { useMediaQuery } from '../../hooks/use-media-query';
import { useRouteContext } from '../../hooks/use-route-context';
import { AnnotateScreen } from './AnnotateScreen';
import { AnnotatePageError } from './AnnotatePageError';

// The image and the form need to sit side by side, so annotating needs at least a tablet held
// sideways (Tailwind's lg). On a smaller screen the screen is not loaded at all, so no task gets
// claimed and blocked for others.
const LARGE_ENOUGH = '(min-width: 1024px)';

export function AnnotatePage() {
  const isLargeEnough = useMediaQuery(LARGE_ENOUGH);
  const { projectSlug } = useRouteContext();

  return isLargeEnough ? <AnnotateScreen /> : <AnnotatePageError projectSlug={projectSlug} error={{ kind: 'small-screen' }} />;
}
