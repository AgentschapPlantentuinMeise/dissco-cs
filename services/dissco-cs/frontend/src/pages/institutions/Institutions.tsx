import React, { useMemo } from 'react';
import { shuffle } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import { institutionQueries } from '../../api/queries/institutions';
import { statsQueries } from '../../api/queries/stats';
import { CsPage } from '../../components/layout/CsPage';
import { InstitutionCard } from '../../components/institutions/InstitutionCard';
import { HeaderMosaic, PageHeader } from '../../components/layout/PageHeader';
import { PageHeaderPhoto } from '../../components/layout/PageHeaderPhoto';
import { HonourBoardBand } from '../../components/stats/HonourBoardBand';
import { useSiteHonourBoard } from '../../hooks/use-site-honour-board';
import { formatNumber } from '../../utility/format-number';
import { PageSection } from '../../components/layout/PageSection';
import { Pagination } from '../../components/ui/Pagination';
import { usePagedGrid } from '../../hooks/use-paged-grid';
import { useNavItems } from '../../hooks/use-nav-items';
import { siteLangText } from '../../utility/site-lang-text';

const ROWS_PER_PAGE = 2;

export function Institutions() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data, isPending } = useQuery(institutionQueries.active());
  const honourBoard = useSiteHonourBoard();
  const { isActive } = useNavItems();

  const institutions = data ?? [];
  // Without a photo from page management the header shows a mosaic of logos: a different pick on
  // every visit, so every institution gets its turn. Shuffled once per load, not on every render.
  const logoMosaic = useMemo(
    () =>
      shuffle(data ?? []).map(institution => ({
        href: `/institutions/${institution.slug}`,
        label: siteLangText(institution.name, i18n.language, institution.slug),
        image: institution.logo ?? undefined,
      })),
    [data, i18n.language]
  );
  const { gridRef, pageItems, currentPage, totalPages, setCurrentPage } = usePagedGrid(institutions, ROWS_PER_PAGE);

  // The same per-institution stats the cards below read, so these come from the cache. A project
  // is linked to at most one institution, so the sum counts no project twice.
  const runningProjects = useQueries({
    queries: institutions.map(institution => ({ ...statsQueries.institution(institution.slug), refetchOnWindowFocus: false })),
    combine: results =>
      results.every(result => result.data) ? results.reduce((sum, result) => sum + (result.data?.projectsActive ?? 0), 0) : null,
  });

  return (
    <CsPage>
      <PageHeader
        variant="split-banner"
        title={t('nav_institutions')}
        lead={t('institutions_intro')}
        stats={[
          { value: isPending ? '—' : formatNumber(institutions.length, i18n.language), label: t('institutions_stat_count') },
          { value: isPending || runningProjects === null ? '—' : formatNumber(runningProjects, i18n.language), label: t('projects_stat_running') },
        ]}
        aside={<PageHeaderPhoto pageKey="institutions" fallback={<HeaderMosaic items={logoMosaic} fit="logo" />} />}
      />
      <PageSection>
        <div ref={gridRef} className="cs-card-grid">
          {pageItems.map(institution => (
            <InstitutionCard key={institution.id} institution={institution} />
          ))}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} label={t('institutions_pagination_label')} />
      </PageSection>

      {/* White, not tint: the Honour Board band right below is tint already. */}
      <PageSection
        tone="white"
        title={t('institutions_join_title')}
        intro={t('institutions_join_intro')}
        action={isActive('contact') ? { href: '/contact', label: t('institutions_join_action') } : undefined}
      />

      <HonourBoardBand board={honourBoard} />
    </CsPage>
  );
}
