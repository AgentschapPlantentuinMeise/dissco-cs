import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { homeStepQueries } from '../../api/queries/home-steps';
import { PageSection } from '../../components/layout/PageSection';
import { siteLangText } from '../../utility/site-lang-text';

// "How it works" on Home, with the steps set in page management. Left out when there are none.
export function HomeStepsSection() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: steps } = useQuery(homeStepQueries.list());

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <PageSection tone="white" title={t('home_steps_title')} intro={t('home_steps_intro')}>
      {/* On a wide screen all steps share one row, however many there are (1 to MAX_HOME_STEPS). */}
      <ol
        className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(var(--step-count),minmax(0,1fr))] gap-7"
        style={{ '--step-count': steps.length } as React.CSSProperties}
      >
        {steps.map((step, index) => (
          <li key={index} className="border-t-[3px] border-cs-primary pt-3.5 min-w-0">
            <span className="block text-[2rem] font-bold text-cs-primary leading-none tabular-nums">{index + 1}</span>
            <h3 className="mt-2.5 mb-1.5 text-[1.15rem] font-semibold text-gray-900">{siteLangText(step.title, i18n.language, '')}</h3>
            <p className="m-0 text-[0.93rem] text-gray-600">{siteLangText(step.body, i18n.language, '')}</p>
          </li>
        ))}
      </ol>
    </PageSection>
  );
}
