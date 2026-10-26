import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';
import { HrefLink } from '../../utility/href-link';
import { buildTaskLink } from '../../utility/build-task-link';
import { formatTimeAgo } from '../../utility/format-date';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { TaskRevisionView } from './TaskRevisionView';
import { LuEye } from 'react-icons/lu';
import { ImagePreviewPopup } from '../../components/iiif/ImagePreviewPopup';
import { TaskTab, taskProjectName } from './dashboard-tasks';
import { taskDisplayName } from '../../utility/task-display-name';
import { rowHoverClass } from '../../components/ui/list-styles';

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

// One page of the user's tasks. Saved tasks link to the annotate page (which returns here after
// saving) and can be released; done tasks open a read-only view of what was submitted.
export function TaskTable({ tasks, userName, variant, onRelease }: {
  tasks: MadocCrowdsourcingTaskDto[];
  userName: string;
  variant: TaskTab;
  onRelease?: (task: MadocCrowdsourcingTaskDto) => void;
}) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewTask, setPreviewTask] = useState<MadocCrowdsourcingTaskDto | null>(null);
  const columnCount = 5;

  return (
    <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>{t('my_tasks_col_task')}</th>
            <th className={thClass}>{t('my_tasks_col_project')}</th>
            <th className={thClass}>{t('my_tasks_col_status')}</th>
            <th className={thClass}>{t('my_tasks_col_modified')}</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const displayName = taskDisplayName(task, userName);
            const badge = getStatusBadge(task.status);
            const isExpanded = expandedId === task.id;
            return (
              <React.Fragment key={task.id}>
                <tr className={`border-b border-[#f0f0f0] last:border-b-0 ${rowHoverClass} max-[600px]:block max-[600px]:px-4 max-[600px]:py-3 max-[600px]:border-b max-[600px]:border-gray-200`}>
                  <td className={tdClass}>
                    {variant === 'done' ? (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}
                        className="bg-transparent border-0 p-0 text-cs-primary font-medium cursor-pointer hover:underline"
                      >
                        {displayName}
                      </button>
                    ) : (
                      <HrefLink
                        href={buildTaskLink(task)}
                        state={{ returnTo: '/my-dashboard' }}
                        className="text-cs-primary no-underline font-medium hover:underline"
                      >
                        {displayName}
                      </HrefLink>
                    )}
                  </td>
                  <td className={`${tdClass} text-gray-500 max-[600px]:text-[0.8rem]`}>{taskProjectName(task, i18n.language) || '—'}</td>
                  <td className={tdClass}>
                    <span className={`${badgeBase} ${BADGE_CLASSES[badge.variant]}`}>{t(badge.label)}</span>
                  </td>
                  <td className={`${tdClass} text-gray-500 whitespace-nowrap max-[600px]:text-[0.8rem]`}>
                    {task.modified_at ? formatTimeAgo(new Date(task.modified_at).toISOString(), i18n.language) : '—'}
                  </td>
                  <td className={`${tdClass} text-right max-[600px]:text-left`}>
                    {variant === 'saved' && onRelease && (
                      <Button variant="secondary" size="sm" onClick={() => onRelease(task)}>
                        {t('my_tasks_release')}
                      </Button>
                    )}
                    {variant === 'done' && task.subject && (
                      <IconButton icon={LuEye} label={t('review_view_image')} onClick={() => setPreviewTask(task)} />
                    )}
                  </td>
                </tr>
                {variant === 'done' && isExpanded && (
                  <tr className="border-b border-[#f0f0f0] last:border-b-0 bg-gray-50">
                    <td className={tdClass} colSpan={columnCount}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[0.8rem] font-semibold text-gray-700">{displayName}</span>
                        <Button variant="text" size="sm" onClick={() => setExpandedId(null)}>
                          {t('review_detail_close')}
                        </Button>
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
