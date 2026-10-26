import { useTranslation } from 'react-i18next';
import { NavItemContentKey } from '@dissco-cs/shared-types';
import { useNavItems } from '../../hooks/use-nav-items';
import { CsMarkdown } from '../ui/CsMarkdown';
import { PageSection } from './PageSection';

// The text written in page management for a page (About, Help, Contact), on white and at a
// readable line length.
export function ManagedTextSection({ pageKey }: { pageKey: Exclude<NavItemContentKey, 'welcome'> }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const { getContent } = useNavItems();
  const content = getContent(pageKey, i18n.language);

  return (
    <PageSection tone="white">
      <div className="max-w-[70ch]">
        {content ? <CsMarkdown content={content} /> : <p className="text-base text-gray-600 m-0">{t('common_no_content')}</p>}
      </div>
    </PageSection>
  );
}
