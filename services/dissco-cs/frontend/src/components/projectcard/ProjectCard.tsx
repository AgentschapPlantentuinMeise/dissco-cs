import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { projectProgressApi, ProjectProgress } from '../../api/cs-api';
import { LocaleString } from '../LocaleString';
import { disscoCSConfig } from '../../dissco-cs-config';

interface ProjectCardProps {
  projectSummaryData: any;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ projectSummaryData }) => {
  const { t } = useTranslation('dissco-cs');
  const { data: progress, isLoading } = useQuery<ProjectProgress>(
    ['project-progress', projectSummaryData.id],
    () => projectProgressApi.get(projectSummaryData.id),
    { staleTime: 60000 }
  );

  const percentage = progress?.transcribedPercentage || 0;

  const imageUrl = typeof projectSummaryData.thumbnail === 'string'
    ? projectSummaryData.thumbnail
    : projectSummaryData.thumbnail?.id || projectSummaryData.templateOptions?.image || null;

  const projectLink = `/explore/${projectSummaryData.slug || projectSummaryData.id}`;

  return (
    <Link
      to={projectLink}
      className="flex flex-col bg-white rounded-lg overflow-hidden shadow-md transition-[transform,box-shadow] duration-200 cursor-pointer h-full no-underline text-inherit hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className="h-[140px] w-full bg-cover bg-center bg-gray-200"
        style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}
      />
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
                <span className="text-gray-500">{t('pdp_transcribed')}</span>
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
