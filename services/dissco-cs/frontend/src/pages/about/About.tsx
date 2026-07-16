import React from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/CsPage';
import { CsMarkdown } from '../../components/CsMarkdown';
import { useSitePages } from '../../contexts/SitePagesContext';

export const About: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { getContent } = useSitePages();

  const dbContent = getContent('about', i18n.language);

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">

          <header className="mb-4">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('nav_about')}</h1>
          </header>


          <section>
            {dbContent ? <CsMarkdown content={dbContent} /> : <p className="text-base text-gray-600">{t('common_no_content')}</p>}
          </section>

        </div>
      </div>
    </CsPage>
  );
};
