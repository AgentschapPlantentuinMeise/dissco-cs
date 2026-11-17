import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { homeStepQueries } from '../../api/queries/home-steps';
import { PageSection } from '../../components/layout/PageSection';
import { SectionLoadError } from '../../components/layout/SectionLoadError';
import { NumberedSteps } from '../../components/ui/NumberedSteps';
import { siteLangText } from '../../utility/site-lang-text';

// "How it works" on Home, with the steps set in page management. Left out when there are none.
export function HomeStepsSection() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: steps, isError } = useQuery(homeStepQueries.list());

  if (isError) {
    return (
      <PageSection tone="white" title={t('home_steps_title')}>
        <SectionLoadError />
      </PageSection>
    );
  }

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <PageSection tone="white" title={t('home_steps_title')} intro={t('home_steps_intro')}>
      <NumberedSteps
        steps={steps.map(step => ({ title: siteLangText(step.title, i18n.language, ''), text: siteLangText(step.body, i18n.language, '') }))}
      />
    </PageSection>
  );
}
