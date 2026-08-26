import React, { useState } from 'react';
import { CrowdsourcingTask } from '../types/crowdsourcing-task';
import { HrefLink } from '../utility/href-link';
import { buildTaskLink } from '../utility/build-task-link';
import { localeText } from '../utility/locale-text';
import { DeleteIconButton } from './DeleteIconButton';
import { TaskRevisionView } from './TaskRevisionView';
import { EyeIcon } from '../icons/EyeIcon';
import { ImagePreviewPopup } from './ImagePreviewPopup';

const BADGE_CLASSES: Record<string, string> = {
  done:     'bg-[#d1e7dd] text-[#0a5940]',
  review:   'bg-[#cfe2ff] text-[#0a4a8f]',
  rejected: 'bg-[#f8d7da] text-[#842029]',
  draft:    'bg-[#fff3cd] text-[#856404]',
};
const badgeBase = 'inline-block px-[10px] py-[3px] rounded-[12px] text-[0.75rem] font-semibold whitespace-nowrap';

export function getStatusBadge(status: number): { label: string; variant: string } {
  if (status === 3 || status === 2 || status === 5) return { label: 'my_tasks_status_done', variant: 'done' };
  if (status === -1) return { label: 'my_tasks_status_rejected', variant: 'rejected' };
  return { label: 'my_tasks_status_draft', variant: 'draft' };
}

const thClass = 'bg-gray-50 px-4 py-3 text-left text-[0.8rem] font-semibold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 max-[600px]:hidden';
const tdClass = 'px-4 py-[14px] text-[0.9rem] text-[#343a40] align-middle max-[600px]:block max-[600px]:px-0 max-[600px]:py-[2px]';

export const tabBtnClass = (isActive: boolean) =>
  `bg-transparent border-0 border-b-2 border-solid mb-[-2px] px-5 py-[10px] text-[0.9rem] cursor-pointer transition-[color,border-color] duration-[0.15s] hover:text-[var(--cs-primary)] ` +
  (isActive ? 'font-semibold text-[var(--cs-primary)] border-b-[var(--cs-primary)]' : 'font-medium text-gray-500 border-b-transparent');

interface TaskTableProps {
  tasks: CrowdsourcingTask[];
  userName: string;
  language: string;
  t: (key: string) => string;
  linkable?: boolean;
  /** Taaknaam klapt in plaats van te navigeren een rij open met de ingediende data (alleen-lezen). */
  expandable?: boolean;
  onRelease?: (task: CrowdsourcingTask) => void;
  /** Na opslaan/indienen op AnnotatePage terug naar dit pad i.p.v. door te gaan naar de volgende taak. */
  returnPath?: string;
}

export function TaskTable({ tasks, userName, language, t, linkable = true, expandable = false, onRelease, returnPath }: TaskTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewTask, setPreviewTask] = useState<CrowdsourcingTask | null>(null);
  const columnCount = 3 + (onRelease ? 1 : 0) + (expandable ? 1 : 0);

  return (
    <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>{t('my_tasks_col_task')}</th>
            <th className={thClass}>{t('my_tasks_col_project')}</th>
            <th className={thClass}>{t('my_tasks_col_status')}</th>
            {onRelease && <th className={thClass} />}
            {expandable && <th className={thClass} />}
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const href = buildTaskLink(task);
            const project = task.metadata?.project;
            const projectName = project ? (localeText(project.label, language) || project.slug) : undefined;
            const badge = getStatusBadge(task.status);
            const prefix = userName + ': ';
            const displayName = task.name?.startsWith(prefix) ? task.name.slice(prefix.length) : task.name;
            const isExpanded = expandedId === task.id;
            return (
              <React.Fragment key={task.id}>
                <tr className="border-b border-[#f0f0f0] last:border-b-0 transition-colors duration-[0.15s] hover:bg-gray-50 max-[600px]:block max-[600px]:px-4 max-[600px]:py-3 max-[600px]:border-b max-[600px]:border-gray-200">
                  <td className={tdClass}>
                    {expandable ? (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}
                        className="bg-transparent border-0 p-0 text-[var(--cs-primary)] font-medium cursor-pointer hover:underline"
                      >
                        {displayName}
                      </button>
                    ) : linkable ? (
                      <HrefLink
                        href={href}
                        state={returnPath ? { returnTo: returnPath } : undefined}
                        className="text-[var(--cs-primary)] no-underline font-medium hover:underline"
                      >
                        {displayName}
                      </HrefLink>
                    ) : (
                      <span className="font-medium">{displayName}</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-gray-500 max-[600px]:text-[0.8rem]`}>{projectName ?? '—'}</td>
                  <td className={tdClass}>
                    <span className={`${badgeBase} ${BADGE_CLASSES[badge.variant]}`}>{t(badge.label)}</span>
                  </td>
                  {onRelease && (
                    <td className={tdClass}>
                      <DeleteIconButton onClick={() => onRelease(task)} />
                    </td>
                  )}
                  {expandable && (
                    <td className={tdClass}>
                      {task.subject && (
                        <button
                          onClick={() => setPreviewTask(task)}
                          aria-label={t('review_view_image')}
                          title={t('review_view_image')}
                          className="bg-transparent border-none text-gray-400 cursor-pointer hover:text-[var(--cs-primary)] p-1"
                        >
                          <EyeIcon />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {expandable && isExpanded && (
                  <tr className="border-b border-[#f0f0f0] last:border-b-0 bg-gray-50">
                    <td className={tdClass} colSpan={columnCount}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[0.8rem] font-semibold text-gray-700">{displayName}</span>
                        <button
                          onClick={() => setExpandedId(null)}
                          className="bg-transparent border-none p-0 text-[0.78rem] font-semibold text-gray-500 cursor-pointer hover:text-[var(--cs-primary)]"
                        >
                          {t('review_detail_close')}
                        </button>
                      </div>
                      <TaskRevisionView taskId={task.id} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {previewTask?.subject && (
        <ImagePreviewPopup
          subject={previewTask.subject}
          label={previewTask.name}
          onClose={() => setPreviewTask(null)}
        />
      )}
    </div>
  );
}
