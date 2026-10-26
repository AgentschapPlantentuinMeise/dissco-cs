import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { ManagedTextSection } from '../../components/layout/ManagedTextSection';
import { useNavItems } from '../../hooks/use-nav-items';

export function Help() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { getIntro } = useNavItems();

  return (
    <CsPage>
      <PageHeader variant="compact" title={t('nav_help')} lead={getIntro('help', i18n.language) || t('help_intro_default')} />
      <ManagedTextSection pageKey="help" />
    </CsPage>
  );
}
