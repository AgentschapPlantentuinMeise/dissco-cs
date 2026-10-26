import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MadocMetadataItemDto } from '@dissco-cs/shared-types';
import { iiifQueries } from '../../api/queries/iiif';
import { useLocaleString } from '../../components/ui/LocaleString';
import { isWebLink, plainText } from './manifest-info';

// The Info panel: what the institution tells about the object (the manifest's IIIF metadata), to
// check a name or a date against while filling in the form.
export function ManifestInfo({ manifestId }: { manifestId: number }) {
  const { t } = useTranslation('dissco-cs');
  const { data, isPending } = useQuery({ ...iiifQueries.manifestMetadata(manifestId), retry: false });
  const [summary] = useLocaleString(data?.summary);

  if (isPending) {
    return <p className="m-0 text-gray-500">{t('pdp_loading')}</p>;
  }

  const items = data ? [...data.metadata, ...(data.requiredStatement ? [data.requiredStatement] : [])] : [];
  const summaryText = plainText(summary);
  if (items.length === 0 && !summaryText) {
    return <p className="m-0 text-gray-500">{t('annotate_info_empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {summaryText && <p className="m-0 text-gray-700 whitespace-pre-line">{summaryText}</p>}
      {items.length > 0 && (
        <dl className="m-0 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-2">
          {items.map((item, index) => (
            <MetadataRow key={index} item={item} />
          ))}
        </dl>
      )}
    </div>
  );
}

function MetadataRow({ item }: { item: MadocMetadataItemDto }) {
  const [label] = useLocaleString(item.label);
  const [value] = useLocaleString(item.value);
  const text = plainText(value);

  return (
    <>
      <dt className="text-gray-500">{plainText(label)}</dt>
      <dd className="m-0 text-gray-800 break-words whitespace-pre-line">
        {isWebLink(text) ? (
          <a href={text} target="_blank" rel="noopener noreferrer" className="text-cs-primary hover:underline">
            {text}
          </a>
        ) : (
          text
        )}
      </dd>
    </>
  );
}
