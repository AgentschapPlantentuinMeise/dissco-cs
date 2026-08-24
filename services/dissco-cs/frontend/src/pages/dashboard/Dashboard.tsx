import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, queryCache } from 'react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useUser } from '../../hooks/use-current-user';
import { getSiteSlug } from '../../api/slug';
import { getTasks, updateTask } from '../../api/madoc-client/tasks';
import { CrowdsourcingTask } from '../../types/crowdsourcing-task';
import { parseUrn } from '../../utility/parse-urn';
import { HrefLink } from '../../utility/href-link';
import { localeText } from '../../utility/locale-text';
import { CsPage } from '../../components/CsPage';
import { disscoCSConfig } from '../../dissco-cs-config';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TrashIcon } from '../../icons/TrashIcon';
import { StatBanner } from '../../components/StatBanner';
import { TaskTable, tabBtnClass } from '../../components/TaskTable';
import { forumApi, ForumTopicWithReplyCount, reviewFeedbackApi, FeedbackThreadWithMeta } from '../../api/cs-api';



const PROJECT_CHART_COLORS = ['#4361ee', '#e63946', '#f4a261', '#2a9d8f', '#9b5de5', '#f15bb5', '#43aa8b', '#ffb703'];

interface ChartSegment { value: number; color: string; name: string }

function DonutChart({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const data = segments.filter(s => s.value > 0);
  return (
    <div className="w-[62px] h-[62px] flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius="100%" paddingAngle={2} startAngle={90} endAngle={-270}>
            {data.map((seg, i) => <Cell key={i} fill={seg.color} stroke="none" />)}
          </Pie>
          <Tooltip formatter={(value: number) => `${value} (${Math.round((value / total) * 100)}%)`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' });

function FeedbackThreadDetail({ threadId }: { threadId: string }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [replyBody, setReplyBody] = useState('');

  const { data, status } = useQuery(['feedback-thread', threadId], () => reviewFeedbackApi.getThread(threadId), {
    onSuccess: () => {
      queryCache.invalidateQueries('feedback-threads');
      window.dispatchEvent(new Event('review_feedback_updated'));
    },
  });

  const [postReply, { status: replyStatus }] = useMutation(
    (body: string) => reviewFeedbackApi.createReply(threadId, body),
    {
      onSuccess: () => {
        setReplyBody('');
        queryCache.invalidateQueries(['feedback-thread', threadId]);
        queryCache.invalidateQueries('feedback-threads');
        window.dispatchEvent(new Event('review_feedback_updated'));
      },
    }
  );

  if (status === 'loading') {
    return <p className="text-sm text-gray-500 mt-3">{t('review_detail_loading')}</p>;
  }
  if (status === 'error' || !data) {
    return <p className="text-sm text-red-600 mt-3">{t('review_detail_error')}</p>;
  }

  return (
    <div className="mt-3 pl-3 border-l-2 border-gray-100" onClick={e => e.stopPropagation()}>
      <ul className="list-none m-0 p-0 flex flex-col gap-3 mb-3">
        {data.messages.map(message => (
          <li key={message.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              <strong className="text-gray-800">{message.author_name}</strong>
              <span className="text-xs text-gray-400">{new Date(message.created_at).toLocaleString(i18n.language)}</span>
            </div>
            <p className="text-gray-700 m-0 mt-0.5 whitespace-pre-wrap">{message.body}</p>
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2">
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          rows={2}
          placeholder={t('dashboard_feedback_reply_placeholder')}
          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-[var(--cs-primary)]"
        />
        <button
          onClick={() => replyBody.trim() && postReply(replyBody.trim())}
          disabled={!replyBody.trim() || replyStatus === 'loading'}
          className="px-4 py-2 rounded-full text-sm font-semibold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
        >
          {t('dashboard_feedback_reply_send')}
        </button>
      </div>
    </div>
  );
}

function FeedbackThreadRow({
  thread,
  isOpen,
  onToggle,
  language,
}: {
  thread: FeedbackThreadWithMeta;
  isOpen: boolean;
  onToggle: () => void;
  language: string;
}) {
  const { t } = useTranslation('dissco-cs');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const otherName = thread.role === 'recipient' ? thread.reviewer_name : thread.recipient_name;
  const directionLabel =
    thread.role === 'recipient'
      ? t('dashboard_feedback_from', { name: otherName })
      : t('dashboard_feedback_to', { name: otherName });

  const [deleteThread] = useMutation(() => reviewFeedbackApi.deleteThread(thread.id), {
    onSuccess: () => {
      queryCache.invalidateQueries('feedback-threads');
      window.dispatchEvent(new Event('review_feedback_updated'));
    },
  });

  return (
    <li className="border-b border-gray-200 last:border-b-0 py-3">
      <div className="flex items-start gap-2">
        <button onClick={onToggle} className="flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer p-0">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              {thread.unread_count > 0 && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--cs-tertiary)' }} />
              )}
              {thread.subject}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">{new Date(thread.last_activity).toLocaleString(language)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{directionLabel}</div>
        </button>
        <button
          onClick={() => setConfirmingDelete(true)}
          aria-label={t('dashboard_feedback_delete_label')}
          title={t('dashboard_feedback_delete_label')}
          className="flex-shrink-0 bg-transparent border-none text-gray-600 cursor-pointer hover:text-[var(--cs-primary)] transition-colors duration-200 p-1"
        >
          <TrashIcon />
        </button>
      </div>
      {isOpen && <FeedbackThreadDetail threadId={thread.id} />}
      {confirmingDelete && (
        <ConfirmDialog
          title={t('dashboard_feedback_delete_confirm_title')}
          message={t('dashboard_feedback_delete_confirm')}
          confirmLabel={t('common_delete')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => {
            setConfirmingDelete(false);
            void deleteThread();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  );
}

export const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useUser();
  const [activeTab, setActiveTab] = useState<'saved' | 'done' | 'feedback'>('saved');
  const [releaseTarget, setReleaseTarget] = useState<CrowdsourcingTask | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const [releaseTask] = useMutation(
    (task: CrowdsourcingTask) => updateTask(task.id, { status: -1, status_text: 'abandoned' }),
    {
      onSuccess: () => {
        queryCache.invalidateQueries('dashboard-tasks');
        queryCache.invalidateQueries('collection');
      },
    }
  );

  const { data: tasksData, status: tasksStatus } = useQuery(
    ['dashboard-tasks', { userId: user?.id }],
    async () => {
      const query = {
        type: 'crowdsourcing-task',
        all_tasks: true,
        assignee: `urn:madoc:user:${user!.id}`,
        per_page: 100,
        sort_by: 'newest',
        detail: true,
      };
      const first = await getTasks<CrowdsourcingTask>(1, query);
      const totalPages = first.pagination?.totalPages ?? 1;
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => getTasks<CrowdsourcingTask>(i + 2, query))
      );
      return { ...first, tasks: [...first.tasks, ...rest.flatMap(r => r.tasks)] };
    },
    { enabled: !!user }
  );

  const { data: siteTotalData } = useQuery(
    ['site-tasks-total'],
    async () => {
      const [review, done] = await Promise.all([
        getTasks(0, { type: 'crowdsourcing-task', all_tasks: true, per_page: 1, status: 2 }),
        getTasks(0, { type: 'crowdsourcing-task', all_tasks: true, per_page: 1, status: 3 }),
      ]);
      return (review.pagination?.totalResults ?? 0) + (done.pagination?.totalResults ?? 0);
    },
    { enabled: !!user }
  );

  const { data: unansweredTopics } = useQuery(
    ['dashboard-unanswered-topics'],
    async () => {
      const res = await forumApi.listTopics();
      return res.topics
        .filter(topic => topic.reply_count === 0)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
    },
    { enabled: !!user }
  );

  const { data: feedbackThreadsData, status: feedbackThreadsStatus } = useQuery(
    'feedback-threads',
    () => reviewFeedbackApi.listThreads(),
    { enabled: !!user }
  );
  const feedbackThreads = feedbackThreadsData?.threads ?? [];

  if (!user) {
    window.location.href = `/s/${getSiteSlug()}/login`;
    return null;
  }

  const tasks: CrowdsourcingTask[] = tasksData?.tasks ?? [];

  const seen = new Set<string>();
  const uniqueTasks = tasks.filter(task => {
    const id = task.id ?? '';
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const s = (task: CrowdsourcingTask) => task.status as number;
  const realTasks = uniqueTasks.filter(task => task.status !== 0 && task.status !== -1);
  const latestPerSubject = new Map<string, CrowdsourcingTask>();
  for (const task of realTasks) {
    const key = `${task.subject ?? task.id}|${task.root_task ?? ''}`;
    const existing = latestPerSubject.get(key);
    if (!existing || (task.modified_at ?? '') > (existing.modified_at ?? '')) {
      latestPerSubject.set(key, task);
    }
  }
  const visibleTasks = Array.from(latestPerSubject.values());

  const savedTasks = visibleTasks.filter(task => s(task) === 1);
  console.log('[Dashboard] savedTasks (status === 1):', savedTasks.length, savedTasks.map(task => ({
    id: task.id, name: task.name, subject: task.subject,
    project: task.metadata?.project ? { id: task.metadata.project.id, slug: task.metadata.project.slug } : undefined,
  })));
  const doneTasks = visibleTasks.filter(task => s(task) === 2 || s(task) === 3 || s(task) === 5);
  const doneCount = doneTasks.length;
  const userDoneCount = uniqueTasks.filter(task => s(task) === 2 || s(task) === 3 || s(task) === 5).length;
  const contributedTasks = visibleTasks;
  const projectIds = contributedTasks.filter(task => task.metadata?.project).map(task => String(task.metadata!.project!.id));
  const projectCount = new Set(projectIds).size;
  const siteTotal = siteTotalData ?? 0;
  const percentage = siteTotal > 0 ? ((userDoneCount / siteTotal) * 100).toFixed(2) : null;
  const isLoading = tasksStatus === 'loading';

  const projectTaskCounts: Record<string, { value: number; name: string }> = {};
  for (const task of contributedTasks) {
    const project = task.metadata?.project;
    if (!project) continue;
    const id = String(project.id);
    const name = localeText(project.label, i18n.language) || project.slug;
    projectTaskCounts[id] = { value: (projectTaskCounts[id]?.value || 0) + 1, name };
  }
  const chartSegments: ChartSegment[] = Object.values(projectTaskCounts).map(({ value, name }, i) => ({
    name,
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
                  <p className="text-[0.86rem] text-[#d7ece9] leading-[1.5] max-w-[26ch] m-0">{t('my_tasks_percentage', { pct: percentage })}</p>
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
                    {feedbackThreads.some(thread => thread.unread_count > 0) && (
                      <span
                        className="inline-block text-white rounded-[10px] px-[6px] py-[1px] text-[0.7rem] font-bold ml-[5px] align-middle leading-[1.4]"
                        style={{ background: 'var(--cs-tertiary)' }}
                      >
                        {feedbackThreads.reduce((sum, thread) => sum + thread.unread_count, 0)}
                      </span>
                    )}
                  </button>
                </div>
                {activeTab === 'saved' && savedTasks.length > 0 && (
                  <div className="text-xs text-gray-400">{t('dashboard_saved_tasks_subtitle', { count: savedTasks.length })}</div>
                )}
              </div>

              {activeTab === 'feedback' ? (
                feedbackThreadsStatus === 'loading' ? (
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
                  <TaskTable tasks={savedTasks} userName={user.name} language={i18n.language} t={t} onRelease={setReleaseTarget} />
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
                    {unansweredTopics.map((topic: ForumTopicWithReplyCount) => (
                      <li key={topic.id} className="border-b border-gray-200 last:border-b-0">
                        <HrefLink
                          href={`/messageboard?topic=${topic.id}`}
                          className="flex flex-col gap-0.5 py-3 no-underline text-inherit hover:text-[var(--cs-primary)]"
                        >
                          <span className="text-sm font-semibold text-gray-800">{topic.title}</span>
                          <span className="text-xs text-gray-500">
                            {topic.author_name} · {formatDate(topic.created_at)} · {t('dashboard_widget_no_reply')}
                          </span>
                        </HrefLink>
                      </li>
                    ))}
                  </ul>
                )}
                <HrefLink
                  href="/messageboard"
                  className="inline-block text-sm text-[var(--cs-primary)] font-semibold no-underline hover:underline mt-3"
                >
                  {t('dashboard_widget_view_all')} <span aria-hidden="true">→</span>
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
