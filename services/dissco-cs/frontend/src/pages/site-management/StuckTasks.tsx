import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, queryCache } from 'react-query';
import { HrefLink } from '../../utility/href-link';
import { buildTaskLink } from '../../utility/build-task-link';
import { localeText } from '../../utility/locale-text';
import { CsPage } from '../../components/CsPage';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { stuckTasksApi, manifestClaimApi, StuckManifestCounter } from '../../api/cs-api';
import { CrowdsourcingTask } from '../../types/crowdsourcing-task';

function statusLabelKey(status: number): string {
  return status === 0 ? 'sm_stuck_tasks_status_not_started' : 'sm_stuck_tasks_status_in_progress';
}

// buildTaskLink() only reads id/subject/subject_parent/metadata.project.slug, all of which a
// manifest-task counter also has — the cast just papers over the unrelated fields (status,
// assignee, ...) that a full CrowdsourcingTask carries but a counter row doesn't need.
function counterTaskLink(counter: StuckManifestCounter): string {
  return buildTaskLink({ id: counter.id, subject: counter.subject, metadata: counter.metadata } as CrowdsourcingTask);
}

export const StuckTasks: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data, refetch, status: queryStatus } = useQuery('stuck-tasks', () => stuckTasksApi.list());
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<CrowdsourcingTask | null>(null);

  const tasks = (data?.tasks ?? []).slice().sort((a, b) => (a.modified_at ?? 0) - (b.modified_at ?? 0));
  const manifestCounters = (data?.manifestCounters ?? []).slice().sort((a, b) => a.modified_at - b.modified_at);

  const release = async (task: CrowdsourcingTask) => {
    setConfirmTask(null);
    setReleasingId(task.id);
    try {
      await stuckTasksApi.release(task.id);
      const projectId = task.metadata?.project?.id;
      const manifestId = task.metadata?.subject?.id;
      if (projectId && manifestId) {
        // Best-effort: madoc-ts only re-syncs the shared max-contributors counter when a NEW
        // claim is created, never on a release — same reason AnnotatePage does this after abandon.
        await manifestClaimApi.resync(projectId, manifestId).catch(err => console.error('[StuckTasks] resync failed', err));
      }
      queryCache.invalidateQueries('collection');
      await refetch();
    } finally {
      setReleasingId(null);
    }
  };

  const resyncCounter = async (counter: StuckManifestCounter) => {
    setResyncingId(counter.id);
    try {
      await stuckTasksApi.resyncManifest(counter.id);
      queryCache.invalidateQueries('collection');
      await refetch();
    } finally {
      setResyncingId(null);
    }
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-3xl text-[var(--cs-primary)] mt-4 mb-2">{t('sm_tile_stuck_tasks_title')}</h1>
          <p className="text-sm text-gray-600 mb-6">{t('sm_stuck_tasks_intro')}</p>

          {queryStatus === 'loading' && <p className="text-sm text-gray-500">{t('sm_manuals_loading')}</p>}

          {queryStatus === 'success' && tasks.length === 0 && manifestCounters.length === 0 && (
            <p className="text-sm text-gray-500">{t('sm_stuck_tasks_empty')}</p>
          )}

          {tasks.length > 0 && (
            <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_manifest')}</th>
                    <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_project')}</th>
                    <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_assignee')}</th>
                    <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_status')}</th>
                    <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_modified')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => {
                    const manifestLabel = localeText(task.metadata?.subject?.label, i18n.language) || task.subject || task.id;
                    const projectLabel = localeText(task.metadata?.project?.label, i18n.language) || task.metadata?.project?.slug || '—';
                    const modified = task.modified_at ? new Date(task.modified_at).toLocaleString(i18n.language) : '—';
                    return (
                      <tr key={task.id}>
                        <td className="px-4 py-3 border-t border-gray-100">
                          <HrefLink href={buildTaskLink(task)} className="text-[var(--cs-primary)] no-underline font-medium hover:underline">
                            {manifestLabel}
                          </HrefLink>
                        </td>
                        <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{projectLabel}</td>
                        <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                          {task.assignee?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                          {t(statusLabelKey(task.status))}
                        </td>
                        <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{modified}</td>
                        <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap">
                          <button
                            onClick={() => setConfirmTask(task)}
                            disabled={releasingId === task.id}
                            className="text-sm font-semibold text-[var(--cs-primary)] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
                          >
                            {t('sm_stuck_tasks_release')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {manifestCounters.length > 0 && (
            <>
              <h2 className="text-xl text-[var(--cs-primary)] mb-2">{t('sm_stuck_tasks_counters_title')}</h2>
              <p className="text-sm text-gray-600 mb-4">{t('sm_stuck_tasks_counters_intro')}</p>
              <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_manifest')}</th>
                      <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_project')}</th>
                      <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_count')}</th>
                      <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_modified')}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {manifestCounters.map(counter => {
                      const manifestLabel = counter.name || counter.subject || counter.id;
                      const projectLabel = localeText(counter.metadata?.project?.label, i18n.language) || counter.metadata?.project?.slug || '—';
                      const modified = new Date(counter.modified_at).toLocaleString(i18n.language);
                      return (
                        <tr key={counter.id}>
                          <td className="px-4 py-3 border-t border-gray-100">
                            <HrefLink href={counterTaskLink(counter)} className="text-[var(--cs-primary)] no-underline font-medium hover:underline">
                              {manifestLabel}
                            </HrefLink>
                          </td>
                          <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{projectLabel}</td>
                          <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                            {counter.validCount} / {counter.maxContributors}
                          </td>
                          <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{modified}</td>
                          <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap">
                            <button
                              onClick={() => void resyncCounter(counter)}
                              disabled={resyncingId === counter.id}
                              className="text-sm font-semibold text-[var(--cs-primary)] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
                            >
                              {t('sm_stuck_tasks_resync')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmTask && (
        <ConfirmDialog
          message={t('sm_stuck_tasks_release_confirm', {
            date: confirmTask.modified_at ? new Date(confirmTask.modified_at).toLocaleString(i18n.language) : '—',
          })}
          confirmLabel={t('sm_stuck_tasks_release')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => void release(confirmTask)}
          onCancel={() => setConfirmTask(null)}
        />
      )}
    </CsPage>
  );
};
