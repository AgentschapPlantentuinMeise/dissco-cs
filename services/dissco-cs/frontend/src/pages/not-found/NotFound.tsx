import { useTranslation } from 'react-i18next';
import { PageNotFound } from '../../components/layout/PageNotFound';

// An address inside the site that no route knows, e.g. /explore/x/y: the gateway passes every path
// under /explore/, /institutions/ and /manage/ to the site, so a typo there lands here.
export function NotFound() {
  const { t } = useTranslation('dissco-cs');
  return <PageNotFound text={t('page_not_found_text')} back={{ href: '/', label: t('page_not_found_back') }} />;
}
