import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { shuffle } from 'lodash-es';
import { useQuery } from '@tanstack/react-query';
import { institutionQueries } from '../../api/queries/institutions';
import { PageSection } from '../../components/layout/PageSection';
import { InstitutionCard } from '../../components/institutions/InstitutionCard';
import { useGridColumnCount } from '../../hooks/use-grid-column-count';
import { useNavItems } from '../../hooks/use-nav-items';

// The institutions on Home: one full row of logo tiles, like the projects above, picked at random
// on every visit so each institution gets its turn. Left out when the Institutions page is switched
// off in page management, or when there are none.
export function HomeInstitutionsSection() {
  const { t } = useTranslation('dissco-cs');
  const { isActive } = useNavItems();
  const { data: institutions } = useQuery(institutionQueries.active());
  const [gridRef, columns] = useGridColumnCount<HTMLDivElement>();
  // Shuffled once per load of the data, not on every render: a resize must not swap the tiles.
  const shuffled = useMemo(() => shuffle(institutions ?? []), [institutions]);

  if (!isActive('institutions') || !institutions || institutions.length === 0) {
    return null;
  }

  return (
    <PageSection
      title={t('home_institutions_title')}
      action={{ href: '/institutions', label: t('institutions_all') }}
    >
      <div ref={gridRef} className="cs-card-grid cs-card-grid--dense">
        {shuffled.slice(0, columns).map(institution => (
          <InstitutionCard key={institution.id} institution={institution} />
        ))}
      </div>
    </PageSection>
  );
}
