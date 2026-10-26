import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectProgress } from '../../hooks/use-project-progress';
import { useReturnState } from '../../hooks/use-return-link';
import { projectImageUrl } from '../../utility/project-image-url';
import { formatNumber } from '../../utility/format-number';
import { LocaleString } from '../ui/LocaleString';
import { CardStat } from '../ui/CardStat';
import { MadocProjectDto } from '@dissco-cs/shared-types';

interface ProjectCardProps {
  projectSummaryData: MadocProjectDto;
}

// A project in a grid (style guide, project card A): image, title, a two-line summary, how far it
// is, and how many volunteers took part. The rest (institution, tasks) stays on the project page.
export function ProjectCard({ projectSummaryData }: ProjectCardProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: progress, isLoading } = useProjectProgress(projectSummaryData.id);

  const percentage = progress?.transcribedPercentage || 0;
  const imageUrl = projectImageUrl(projectSummaryData);
  const projectLink = `/explore/${projectSummaryData.slug || projectSummaryData.id}`;
  const returnState = useReturnState();

  return (
    <Link
      to={projectLink}
      state={returnState}
      className="flex flex-col bg-white rounded-md overflow-hidden transition-transform duration-200 cursor-pointer h-full no-underline text-inherit hover:-translate-y-1"
    >
      <div className="h-[190px] w-full bg-cover bg-center bg-gray-100" style={{ backgroundImage: `url(${imageUrl})` }} />
      <div className="px-[22px] pt-5 pb-[22px] flex flex-col gap-2 flex-grow min-w-0">
        <LocaleString as="h3" className="text-[1.3rem] font-medium leading-tight m-0 text-cs-primary">
          {projectSummaryData.label}
        </LocaleString>
        <p className="text-[0.93rem] text-gray-600 leading-[1.5] m-0 line-clamp-2">
          <LocaleString defaultText={t('card_default_summary')}>{projectSummaryData.summary}</LocaleString>
        </p>
        {progress?.allTasksTaken && (
          <span className="self-start text-[0.7rem] font-bold text-amber-800 bg-amber-50 rounded-full px-2.5 py-0.5">
            {t('card_all_tasks_taken')}
          </span>
        )}

        <div className="mt-auto pt-2 flex flex-col gap-2">
          <div className="flex justify-between text-[0.84rem]">
            {isLoading ? (
              <span className="text-gray-500">{t('card_loading')}</span>
            ) : (
              <>
                <span className="font-bold text-cs-primary">{percentage}%</span>
                <span className="text-gray-500">{t('pdp_completed')}</span>
              </>
            )}
          </div>
          <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-cs-primary rounded" style={{ width: `${percentage}%`, transition: 'width 0.5s ease' }} />
          </div>
          {progress && (
            <div className="pt-2.5 border-t border-gray-100 text-[0.84rem] text-gray-600">
              <CardStat value={formatNumber(progress.volunteers, i18n.language)} label={t('card_volunteers', { count: progress.volunteers })} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
