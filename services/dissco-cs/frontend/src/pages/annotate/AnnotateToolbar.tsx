import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft, LuArrowRight, LuBookOpen, LuChevronRight, LuMail } from 'react-icons/lu';
import { MadocInternationalString } from '@dissco-cs/shared-types';
import { LocaleString } from '../../components/ui/LocaleString';
import { Button } from '../../components/ui/Button';

// The bar above the annotate screen: breadcrumb, manual, forum message, previous and next task.
// Every way out goes through onLeave, so the claim is released before navigating.
export function AnnotateToolbar({ projectSlug, projectLabel, canvasLabel, onLeave, onOpenManual, onOpenForum, canGoPrevious, onPrevious, isLoadingNext, onNext }: {
  projectSlug: string;
  projectLabel: MadocInternationalString;
  canvasLabel: MadocInternationalString | undefined;
  onLeave: (to: string) => void;
  onOpenManual: () => void;
  // Not offered on a submitted task.
  onOpenForum: (() => void) | null;
  canGoPrevious: boolean;
  onPrevious: () => void;
  isLoadingNext: boolean;
  onNext: () => void;
}) {
  const { t } = useTranslation('dissco-cs');

  const leaveLink = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onLeave(to);
  };

  return (
    <div className="px-4 py-2 border-b border-gray-300 flex items-center justify-between flex-shrink-0">
      <nav className="text-[0.85rem] text-gray-500 flex items-center" aria-label={t('annotate_breadcrumb_label')}>
        <Link to="/explore" onClick={leaveLink('/explore')} className="text-cs-primary no-underline hover:underline">
          {t('nav_projects')}
        </Link>
        <LuChevronRight aria-hidden="true" className="mx-1" />
        <Link to={`/explore/${projectSlug}`} onClick={leaveLink(`/explore/${projectSlug}`)} className="text-cs-primary no-underline hover:underline">
          <LocaleString>{projectLabel}</LocaleString>
        </Link>
        <LuChevronRight aria-hidden="true" className="mx-1" />
        <LocaleString>{canvasLabel ?? { en: ['...'] }}</LocaleString>
      </nav>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onOpenManual}>
          <LuBookOpen aria-hidden="true" /> {t('annotate_manual_button')}
        </Button>
        {onOpenForum && (
          <Button variant="secondary" size="sm" onClick={onOpenForum}>
            <LuMail aria-hidden="true" /> {t('annotate_forum_button')}
          </Button>
        )}
        <Button variant="secondary" size="sm" disabled={!canGoPrevious} onClick={onPrevious}>
          <LuArrowLeft aria-hidden="true" /> {t('annotate_prev_task')}
        </Button>
        <Button variant="secondary" size="sm" loading={isLoadingNext} onClick={onNext}>
          {t('annotate_next_task')} <LuArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
