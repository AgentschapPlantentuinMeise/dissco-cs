import { useTranslation } from 'react-i18next';
import { PageLoadError } from '../../components/layout/PageLoadError';

// A management screen whose data failed to load. Never show its form or list then: with the
// defaults or an empty list in place, saving would overwrite what is really stored.
export function ManageLoadError() {
  const { t } = useTranslation('dissco-cs');
  return <PageLoadError back={{ href: '/manage', label: t('sm_back_to_hub') }} />;
}
