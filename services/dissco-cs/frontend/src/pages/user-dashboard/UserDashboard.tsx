import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackQueries } from '../../api/queries/feedback';
import { projectKeys } from '../../api/queries/projects';
import { taskKeys, taskQueries } from '../../api/queries/tasks';
import { forumQueries } from '../../api/queries/forum';
import { useCurrentUser } from '../../hooks/use-current-user';
import { tasksApi } from '../../api/cs-client/tasks';
import { HrefLink } from '../../utility/href-link';
import { localeText } from '../../utility/locale-text';
import { formatDate } from '../../utility/format-date';
import { CsPage } from '../../components/layout/CsPage';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatBanner } from '../../components/ui/StatBanner';
import { TaskTable, tabBtnClass } from './TaskTable';
import { MadocCrowdsourcingTaskDto, ForumTopicDto } from '@dissco-cs/shared-types';
import { useSiteStats } from '../../hooks/use-site-stats';
import { LuArrowRight } from 'react-icons/lu';
import { ChartSegment, DonutChart } from './DonutChart';
import { FeedbackThreadRow } from './FeedbackThreadRow';
import { sharePercentage, summarizeTasks } from './dashboard-tasks';

const PROJECT_CHART_COLORS = ['#4361ee', '#e63946', '#f4a261', '#2a9d8f', '#9b5de5', '#f15bb5', '#43aa8b', '#ffb703'];

export const UserDashboard: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'saved' | 'done' | 'feedback'>('saved');
  const [releaseTarget, setReleaseTarget] = useState<MadocCrowdsourcingTaskDto | null>(null);
  const [openThreadId, setOpenThreadId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { mutate: releaseTask } = useMutation({
    mutationFn: (task: MadocCrowdsourcingTaskDto) => tasksApi.update(task.id, { status: -1, status_text: 'abandoned' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    meta: { errorMessage: 'error_release_failed' },
  });

  const { data: tasksData, status: tasksStatus } = useQuery(taskQueries.mine(user?.id));

  // taskQueries.mine (all_tasks: true) is forwarded as the user, so it only ever returns the calling
  // user's own tasks for a non-admin contributor (see docs/MANIFEST-CLAIMS.md) — so the site-wide
  // total has to come from the backend-computed stats instead, same as the homepage banner.
  const { data: siteStats } = useSiteStats();

  const { data: unansweredTopics } = useQuery({
    ...forumQueries.topics(),
    select: topics =>
      topics
        .filter(topic => topic.replyCount === 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    enabled: !!user,
  });

  const { data: feedbackThreads = [], status: feedbackThreadsStatus } = useQuery({ ...feedbackQueries.threads(), enabled: !!user });

  // The route sits behind <AuthGate>, which already sends a visitor without a session to login.
  if (!user) return null;

  const { savedTasks, doneTasks, contributedTasks, userDoneCount, projectCount, projectTaskCounts } = summarizeTasks(
    tasksData?.tasks ?? []
  );
  const doneCount = doneTasks.length;
  const percentage = sharePercentage(userDoneCount, siteStats?.tasksCompleted ?? 0);
  const isLoading = tasksStatus === 'pending';

  const chartSegments: ChartSegment[] = projectTaskCounts.map(({ value, project }, i) => ({
    name: localeText(project.label, i18n.language) || project.slug,
    value,
    color: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length],
  }));

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <h1 className="text-4xl text-[var(--cs-primary)] mt-0 mb-5">{t('dashboard_welcome', { name: user.name })}</h1>
          <p className="text-base leading-relaxed text-gray-700 m-0 mb-6">{t('dashboard_subtitle')}</p>

          <hr className="mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-14">
            <div>
              <StatBanner
                className="mb-8"
                stats={[
                  { value: contributedTasks.length, label: t('my_tasks_total') },
                  { value: doneCount, label: t('my_tasks_completed') },
                  { value: projectCount, label: t('my_tasks_projects') },
                ]}
                trailingDivider
                trailing={percentage !== null ? (
                  <p className="text-[0.86rem] text-[#d7ece9] leading-[1.5] m-0">{t('my_tasks_percentage', { pct: percentage })}</p>
                ) : undefined}
              />

              <div className="flex items-baseline justify-between mb-4 border-b-2 border-gray-200">
                <div className="flex">
                  <button className={tabBtnClass(activeTab === 'saved')} onClick={() => setActiveTab('saved')}>
                    {t('my_tasks_tab_saved')}
                  </button>
                  <button className={tabBtnClass(activeTab === 'done')} onClick={() => setActiveTab('done')}>
                    {t('my_tasks_tab_done')}
                  </button>
                  <button className={tabBtnClass(activeTab === 'feedback')} onClick={() => setActiveTab('feedback')}>
                    {t('dashboard_feedback_tab')}
                    {feedbackThreads.some(thread => thread.unreadCount > 0) && (
                      <span
                        className="inline-block text-white rounded-[10px] px-[6px] py-[1px] text-[0.7rem] font-bold ml-[5px] align-middle leading-[1.4]"
                        style={{ background: 'var(--cs-tertiary)' }}
                      >
                        {feedbackThreads.reduce((sum, thread) => sum + thread.unreadCount, 0)}
                      </span>
                    )}
                  </button>
                </div>
                {activeTab === 'saved' && savedTasks.length > 0 && (
                  <div className="text-xs text-gray-400">{t('dashboard_saved_tasks_subtitle', { count: savedTasks.length })}</div>
                )}
              </div>

              {activeTab === 'feedback' ? (
                feedbackThreadsStatus === 'pending' ? (
                  <div className="text-center py-16 text-gray-500">{t('my_tasks_loading')}</div>
                ) : feedbackThreads.length === 0 ? (
                  <div className="px-1 py-10 text-center text-gray-500">{t('dashboard_feedback_empty')}</div>
                ) : (
                  <ul className="list-none m-0 p-0">
                    {feedbackThreads.map(thread => (
                      <FeedbackThreadRow
                        key={thread.id}
                        thread={thread}
                        isOpen={openThreadId === thread.id}
                        onToggle={() => setOpenThreadId(id => (id === thread.id ? null : thread.id))}
                        language={i18n.language}
                      />
                    ))}
                  </ul>
                )
              ) : isLoading ? (
                <div className="text-center py-16 text-gray-500">{t('my_tasks_loading')}</div>
              ) : activeTab === 'saved' ? (
                savedTasks.length === 0 ? (
                  <div className="px-1 py-10 text-center text-gray-500">{t('my_tasks_empty')}</div>
                ) : (
                  <TaskTable tasks={savedTasks} userName={user.name} language={i18n.language} t={t} onRelease={setReleaseTarget} returnPath="/my-dashboard" />
                )
              ) : (
                doneTasks.length === 0 ? (
                  <div className="px-1 py-10 text-center text-gray-500">{t('my_tasks_empty_done')}</div>
                ) : (
                  <TaskTable tasks={doneTasks} userName={user.name} language={i18n.language} t={t} expandable />
                )
              )}
            </div>

            <div className="flex flex-col gap-7">
              {chartSegments.length > 0 && (
                <div className="pb-7 border-b border-gray-100">
                  <h2 className="text-[1.05rem] font-semibold text-[var(--cs-primary)] m-0 mb-4">{t('my_tasks_projects')}</h2>
                  <div className="flex items-center gap-3.5">
                    <DonutChart segments={chartSegments} />
                    <div className="flex flex-col gap-[5px] text-xs text-gray-600">
                      {chartSegments.filter(s => s.value > 0).map(s => {
                        const total = chartSegments.reduce((sum, seg) => sum + seg.value, 0);
                        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                        return (
                          <div key={s.name} className="flex items-center gap-[6px]">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                            <span>{s.name} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-[1.05rem] font-semibold text-[var(--cs-primary)] m-0 mb-4">{t('dashboard_widget_title')}</h2>
                {!unansweredTopics || unansweredTopics.length === 0 ? (
                  <p className="text-sm text-gray-500 m-0">{t('dashboard_widget_empty')}</p>
                ) : (
                  <ul className="list-none m-0 p-0 flex flex-col">
                    {unansweredTopics.map((topic: ForumTopicDto) => (
                      <li key={topic.id} className="border-b border-gray-200 last:border-b-0">
                        <HrefLink
                          href={`/forum?topic=${topic.id}`}
                          className="flex flex-col gap-0.5 py-3 no-underline text-inherit hover:text-[var(--cs-primary)]"
                        >
                          <span className="text-sm font-semibold text-gray-800">{topic.title}</span>
                          <span className="text-xs text-gray-500">
                            {topic.authorName} · {formatDate(topic.createdAt, i18n.language)} · {t('dashboard_widget_no_reply')}
                          </span>
                        </HrefLink>
                      </li>
                    ))}
                  </ul>
                )}
                <HrefLink
                  href="/forum"
                  className="inline-flex items-center gap-1 text-sm text-[var(--cs-primary)] font-semibold no-underline hover:underline mt-3"
                >
                  {t('dashboard_widget_view_all')} <LuArrowRight aria-hidden="true" />
                </HrefLink>
              </div>
            </div>
          </div>

          {releaseTarget && (
            <ConfirmDialog
              title={t('my_tasks_release_confirm_title')}
              message={t('my_tasks_release_confirm')}
              confirmLabel={t('common_delete')}
              cancelLabel={t('common_cancel')}
              onConfirm={() => {
                void releaseTask(releaseTarget);
                setReleaseTarget(null);
              }}
              onCancel={() => setReleaseTarget(null)}
            />
          )}
        </div>
      </div>
    </CsPage>
  );
};
