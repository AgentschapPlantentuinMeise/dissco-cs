import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { InstitutionDto, InstitutionStatsDto } from '@dissco-cs/shared-types';
import { statsQueries } from '../../api/queries/stats';
import { siteLangText } from '../../utility/site-lang-text';
import { formatNumber } from '../../utility/format-number';
import { useReturnState } from '../../hooks/use-return-link';
import { CardStat } from '../ui/CardStat';

interface InstitutionCardProps {
  institution: InstitutionDto;
  // The bottom line instead of running projects and volunteers, from the same stats, e.g. the
  // user's own tasks for this institution on the dashboard.
  footer?: (stats: InstitutionStatsDto) => React.ReactNode;
}

// An institution in a grid, built like a project card: its logo as the picture on top, the name,
// and one line with its running projects and volunteers. The logos come in every shape and colour,
// so they sit small in a fixed white area; at full size side by side they made the grid restless.
// The description and the rest of the numbers stay on the institution page, which reads the same
// (cached) stats.
export function InstitutionCard({ institution, footer }: InstitutionCardProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: stats } = useQuery({ ...statsQueries.institution(institution.slug), refetchOnWindowFocus: false });
  const name = siteLangText(institution.name, i18n.language, institution.slug);
  const returnState = useReturnState();

  return (
    <Link
      to={`/institutions/${institution.slug}`}
      state={returnState}
      className="flex flex-col bg-white rounded-md overflow-hidden h-full no-underline text-inherit transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="h-[120px] grid place-items-center px-6 border-b border-gray-100">
        {institution.logo && (
          <div
            className="w-[60%] h-16 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${institution.logo})` }}
          />
        )}
      </div>
      <div className="px-[22px] pt-4 pb-[18px] flex flex-col gap-3 flex-grow">
        <h3 className="text-[1.15rem] font-medium leading-tight m-0 text-center text-cs-primary">{name}</h3>
        <div className="mt-auto pt-2.5 border-t border-gray-100 flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-[0.84rem] text-gray-600">
          {stats && footer ? (
            footer(stats)
          ) : stats ? (
            <>
              <CardStat
                value={formatNumber(stats.projectsActive, i18n.language)}
                label={t('card_projects_active', { count: stats.projectsActive })}
              />
              <CardStat value={formatNumber(stats.volunteers, i18n.language)} label={t('card_volunteers', { count: stats.volunteers })} />
            </>
          ) : (
            <span>{t('card_loading')}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
