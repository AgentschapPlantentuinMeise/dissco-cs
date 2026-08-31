import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectProgress } from '../../hooks/use-project-progress';
import { LocaleString } from '../LocaleString';
import { disscoCSConfig } from '../../dissco-cs-config';
import { LuShapes } from 'react-icons/lu';

interface ProjectCardProps {
  projectSummaryData: any;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ projectSummaryData }) => {
  const { t } = useTranslation('dissco-cs');
  const { data: progress, isLoading } = useProjectProgress(projectSummaryData.id);

  const percentage = progress?.transcribedPercentage || 0;

  const imageUrl = typeof projectSummaryData.thumbnail === 'string'
    ? projectSummaryData.thumbnail
    : projectSummaryData.thumbnail?.id || projectSummaryData.templateOptions?.image || null;

  const projectLink = `/explore/${projectSummaryData.slug || projectSummaryData.id}`;

  return (
    <Link
      to={projectLink}
      className="flex flex-col bg-white rounded-lg overflow-hidden transition-transform duration-200 cursor-pointer h-full no-underline text-inherit hover:-translate-y-1"
    >
      {imageUrl ? (
        <div
          className="h-[140px] w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="h-[140px] w-full flex items-center justify-center bg-gradient-to-br from-white to-gray-100 text-gray-300">
          <LuShapes className="w-9 h-9" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-grow">
        <LocaleString as="h3" className="text-xl mt-0 mb-2.5 text-[var(--cs-primary)]">
          {projectSummaryData.label}
        </LocaleString>
        <p className="text-[0.95rem] text-gray-600 leading-[1.5] mb-5 flex-grow line-clamp-3">
          <LocaleString defaultText={t('card_default_summary')}>
            {projectSummaryData.summary}
          </LocaleString>
        </p>

        <div className="mt-auto">
          <div className="flex justify-between text-[0.85rem] mb-[5px]">
            {isLoading ? (
              <span className="font-bold text-[var(--cs-primary)]">{t('card_loading')}</span>
            ) : (
              <>
                <span className="font-bold text-[var(--cs-primary)]">{percentage}%</span>
                <span className="text-gray-500">{t('pdp_completed')}</span>
              </>
            )}
          </div>
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-[var(--cs-primary)] rounded"
              style={{ width: `${percentage}%`, transition: 'width 0.5s ease' }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
};
