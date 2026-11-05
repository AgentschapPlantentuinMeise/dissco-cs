import { useQuery } from '@tanstack/react-query';
import { iiifQueries } from '../../api/queries/iiif';
import { useLocaleString } from '../../components/ui/LocaleString';
import { plainText } from './manifest-info';

// What the institution tells about the object (the manifest's IIIF metadata), for the Info panel
// and for its button, which only exists when there is something to show.
export function useManifestInfo(manifestId: number | undefined) {
  const { data, isPending } = useQuery({ ...iiifQueries.manifestMetadata(manifestId), retry: false });
  const [summary] = useLocaleString(data?.summary);

  const items = data ? [...data.metadata, ...(data.requiredStatement ? [data.requiredStatement] : [])] : [];
  const summaryText = plainText(summary);

  return { isPending, items, summaryText, hasInfo: items.length > 0 || !!summaryText };
}
