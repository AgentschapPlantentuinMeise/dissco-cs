import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, queryCache } from 'react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useUser } from '../../hooks/use-current-user';
import { getSiteSlug } from '../../api/slug';
import { madocClient } from '../../api/madoc-client';
import { CrowdsourcingTask } from '../../types/crowdsourcing-task';
import { parseUrn } from '../../utility/parse-urn';
import { HrefLink } from '../../utility/href-link';
import { buildTaskLink } from '../../utility/build-task-link';
import { localeText } from '../../utility/locale-text';
import { CsPage } from '../../components/CsPage';
import { disscoCSConfig } from '../../dissco-cs-config';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DeleteIconButton } from '../../components/DeleteIconButton';



const PROJECT_CHART_COLORS = ['#4361ee', '#e63946', '#f4a261', '#2a9d8f', '#9b5de5', '#f15bb5', '#43aa8b', '#ffb703'];

interface ChartSegment { value: number; color: string; name: string }

function DonutChart({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const data = segments.filter(s => s.value > 0);
  return (
    <div className="w-[120px] h-[120px] max-[768px]:w-[80px] max-[768px]:h-[80px]">
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

const BADGE_CLASSES: Record<string, string> = {
  done:     'bg-[#d1e7dd] text-[#0a5940]',
  review:   'bg-[#cfe2ff] text-[#0a4a8f]',
  rejected: 'bg-[#f8d7da] text-[#842029]',
  draft:    'bg-[#fff3cd] text-[#856404]',
};
const badgeBase = 'inline-block px-[10px] py-[3px] rounded-[12px] text-[0.75rem] font-semibold whitespace-nowrap';

function getStatusBadge(status: number): { label: string; variant: string } {
  if (status === 3 || status === 2 || status === 5) return { label: 'my_tasks_status_done', variant: 'done' };
  if (status === -1) return { label: 'my_tasks_status_rejected', variant: 'rejected' };
  return { label: 'my_tasks_status_draft', variant: 'draft' };
}

const thClass = 'bg-gray-50 px-4 py-3 text-left text-[0.8rem] font-semibold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 max-[600px]:hidden';
const tdClass = 'px-4 py-[14px] text-[0.9rem] text-[#343a40] align-middle max-[600px]:block max-[600px]:px-0 max-[600px]:py-[2px]';

interface TaskTableProps {
  tasks: CrowdsourcingTask[];
  userName: string;
  language: string;
  t: (key: string) => string;
  linkable?: boolean;
  onRelease?: (task: CrowdsourcingTask) => void;
}

function TaskTable({ tasks, userName, language, t, linkable = true, onRelease }: TaskTableProps) {
  return (
    <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>{t('my_tasks_col_task')}</th>
            <th className={thClass}>{t('my_tasks_col_project')}</th>
            <th className={thClass}>{t('my_tasks_col_status')}</th>
            {onRelease && <th className={thClass} />}
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
            return (
              <tr key={task.id} className="border-b border-[#f0f0f0] last:border-b-0 transition-colors duration-[0.15s] hover:bg-gray-50 max-[600px]:block max-[600px]:px-4 max-[600px]:py-3 max-[600px]:border-b max-[600px]:border-gray-200">
                <td className={tdClass}>
                  {linkable ? (
                    <HrefLink href={href} className="text-[var(--cs-primary)] no-underline font-medium hover:underline">
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const tabBtnClass = (isActive: boolean) =>
  `bg-transparent border-0 border-b-2 border-solid mb-[-2px] px-5 py-[10px] text-[0.9rem] cursor-pointer transition-[color,border-color] duration-[0.15s] hover:text-[var(--cs-primary)] ` +
  (isActive ? 'font-semibold text-[var(--cs-primary)] border-b-[var(--cs-primary)]' : 'font-medium text-gray-500 border-b-transparent');

export const UserDashboard: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useUser();
  const [activeTab, setActiveTab] = useState<'saved' | 'done'>('saved');
  const [releaseTarget, setReleaseTarget] = useState<CrowdsourcingTask | null>(null);

  // Zelfde abandon-patroon als AnnotatePage.tsx's releaseClaim: status -1 zodat de bestaande
  // filters (status !== -1) de taak meteen als losgelaten behandelen, geen nieuwe status nodig.
  const [releaseTask] = useMutation(
    (task: CrowdsourcingTask) => madocClient.updateTask(task.id, { status: -1, status_text: 'abandoned' }),
    {
      onSuccess: () => {
        queryCache.invalidateQueries('my-tasks');
        queryCache.invalidateQueries('collection');
      },
    }
  );

  const { data: tasksData, status: tasksStatus } = useQuery(
    ['my-tasks', { userId: user?.id }],
    async () => {
      const query = {
        type: 'crowdsourcing-task',
        all_tasks: true,
        assignee: `urn:madoc:user:${user!.id}`,
        per_page: 100,
        sort_by: 'newest',
        detail: true,
      };
      // tasks-api appears to cap its effective page size below our requested per_page (e.g. 58
      // results still came back as totalPages: 2) — fetch every page so nothing past page 1 is
      // silently dropped, instead of trusting per_page to mean "give me everything in one page".
      const first = await madocClient.getTasks<CrowdsourcingTask>(1, query);
      const totalPages = first.pagination?.totalPages ?? 1;
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => madocClient.getTasks<CrowdsourcingTask>(i + 2, query))
      );
      return { ...first, tasks: [...first.tasks, ...rest.flatMap(r => r.tasks)] };
    },
    { enabled: !!user }
  );

  // Site-wide count of "completed" tasks — a task in review (status 2) counts as completed here
  // too, same as the per-user done bucket below, so a single query for status 3 alone would
  // undercount and keep this percentage at 0 while submissions are still awaiting review.
  const { data: siteTotalData } = useQuery(
    ['site-tasks-total'],
    async () => {
      const [review, done] = await Promise.all([
        madocClient.getTasks(0, { type: 'crowdsourcing-task', all_tasks: true, per_page: 1, status: 2 }),
        madocClient.getTasks(0, { type: 'crowdsourcing-task', all_tasks: true, per_page: 1, status: 3 }),
      ]);
      return (review.pagination?.totalResults ?? 0) + (done.pagination?.totalResults ?? 0);
    },
    { enabled: !!user }
  );

  if (!user) {
    window.location.href = `/s/${getSiteSlug()}/login`;
    return null;
  }

  const tasks: CrowdsourcingTask[] = tasksData?.tasks ?? [];

  console.log('[UserDashboard] raw tasks count:', tasks.length);
  console.log('[UserDashboard] task statuses:', tasks.map(t => ({ id: t.id, name: t.name, status: t.status, root_task: t.root_task })));
  console.log('[UserDashboard] siteTotalData (status 2+3 combined):', siteTotalData);

  const seen = new Set<string>();
  const uniqueTasks = tasks.filter(t => {
    const id = t.id ?? '';
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const s = (t: CrowdsourcingTask) => t.status as number;
  // status 0 = enkel automatisch geclaimd bij het openen van een manifest/canvas, nog geen inhoud opgeslagen
  // status -1 = rejected/abandoned, daar werken we niet mee
  const realTasks = uniqueTasks.filter(t => t.status !== 0 && t.status !== -1);
  // Herhaaldelijk claimen/verlaten/opnieuw opslaan van hetzelfde specimen (binnen hetzelfde project)
  // laat meerdere taak-rijen na voor dezelfde bijdrage — toon enkel de meest recent gewijzigde per
  // (subject, project), zodat oudere afgesloten pogingen niet als losse "open" taken meetellen.
  const latestPerSubject = new Map<string, CrowdsourcingTask>();
  for (const t of realTasks) {
    const key = `${t.subject ?? t.id}|${t.root_task ?? ''}`;
    const existing = latestPerSubject.get(key);
    if (!existing || (t.modified_at ?? '') > (existing.modified_at ?? '')) {
      latestPerSubject.set(key, t);
    }
  }
  const visibleTasks = Array.from(latestPerSubject.values());
  console.log('[UserDashboard] excluded status 0 tasks (auto-claim, geen inhoud):', uniqueTasks.filter(t => t.status === 0).map(t => ({
    id: t.id, name: t.name, root_task: t.root_task,
  })));
  console.log('[UserDashboard] excluded status -1 tasks (rejected/abandoned):', uniqueTasks.filter(t => t.status === -1).map(t => ({
    id: t.id, name: t.name, root_task: t.root_task,
  })));
  console.log('[UserDashboard] oudere duplicaten per specimen+project verborgen (niet de meest recente):',
    realTasks.filter(t => !visibleTasks.includes(t)).map(t => ({ id: t.id, name: t.name, subject: t.subject, modified_at: t.modified_at })));
  console.log('[UserDashboard] visibleTasks (gededupliceerd, status 1/2/3/5):', visibleTasks.length, visibleTasks.map(t => ({
    id: t.id, name: t.name, status: t.status, root_task: t.root_task, subject: t.subject, subject_parent: t.subject_parent,
  })));

  const savedTasks = visibleTasks.filter(t => s(t) === 1);
  const doneTasks = visibleTasks.filter(t => s(t) === 2 || s(t) === 3 || s(t) === 5);
  const doneCount = doneTasks.length;
  const userDoneCount = uniqueTasks.filter(t => s(t) === 2 || s(t) === 3 || s(t) === 5).length;
  const contributedTasks = visibleTasks;
  // Grouped by the server-resolved project id (task.metadata.project), not root_task directly —
  // works even for older tasks where root_task itself was never set (see metadata.project comment
  // on the type), as long as Madoc could trace the task's parent_task chain to a project.
  const projectIds = contributedTasks.filter(t => t.metadata?.project).map(t => String(t.metadata!.project!.id));
  const projectCount = new Set(projectIds).size;
  console.log('[UserDashboard] savedTasks (status === 1):', savedTasks.length, savedTasks.map(t => ({ id: t.id, name: t.name, project: t.metadata?.project })));
  console.log('[UserDashboard] doneTasks (status 2/3/5):', doneTasks.length, doneTasks.map(t => ({ id: t.id, name: t.name, status: t.status, project: t.metadata?.project })));
  console.log('[UserDashboard] projectCount (distinct metadata.project.id):', projectCount, projectIds);
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
      <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-20 max-[600px]:px-4 max-[600px]:pt-8 max-[600px]:pb-16">
        <h1 className="text-[1.8rem] font-bold text-[var(--cs-primary)] m-0 mb-8">{t('my_tasks_title')}</h1>

        <div className="flex gap-6 items-start max-[768px]:flex-col">
          <div className="flex-[3] min-w-0">
            <div className="flex border-b-2 border-gray-200 mb-3">
              <button className={tabBtnClass(activeTab === 'saved')} onClick={() => setActiveTab('saved')}>
                {t('my_tasks_tab_saved')}
              </button>
              <button className={tabBtnClass(activeTab === 'done')} onClick={() => setActiveTab('done')}>
                {t('my_tasks_tab_done')}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-16 text-gray-500">{t('my_tasks_loading')}</div>
            ) : activeTab === 'saved' ? (
              savedTasks.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">{t('my_tasks_empty')}</div>
              ) : (
                <TaskTable tasks={savedTasks} userName={user.name} language={i18n.language} t={t} onRelease={setReleaseTarget} />
              )
            ) : (
              doneTasks.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">{t('my_tasks_empty_done')}</div>
              ) : (
                <TaskTable tasks={doneTasks} userName={user.name} language={i18n.language} t={t} linkable={false} />
              )
            )}
          </div>

          <div className="flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-6 flex flex-col gap-5 mb-4 max-[768px]:flex-row max-[768px]:flex-wrap max-[768px]:gap-6 max-[768px]:p-5">
              <h2 className="text-[0.78rem] font-bold text-gray-500 uppercase tracking-[0.04em] m-0 max-[768px]:w-full">{t('my_tasks_contribution_title')}</h2>
              <div className="flex flex-col items-center gap-3 max-[768px]:flex-row max-[768px]:items-center">
                <DonutChart segments={chartSegments} />
                <div className="flex flex-col gap-[6px] text-[0.82rem] text-gray-600 w-full">
                  {chartSegments.filter(s => s.value > 0).map(s => {
                    const total = chartSegments.reduce((sum, seg) => sum + seg.value, 0);
                    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                    return (
                      <div key={s.name} className="flex items-center gap-[6px]">
                        <span className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span>{s.name} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 justify-around">
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[1.8rem] font-bold text-[var(--cs-primary)] leading-none mb-1">{contributedTasks.length}</span>
                  <span className="text-[0.78rem] text-gray-500 text-center">{t('my_tasks_total')}</span>
                </div>
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[1.8rem] font-bold text-[var(--cs-primary)] leading-none mb-1">{doneCount}</span>
                  <span className="text-[0.78rem] text-gray-500 text-center">{t('my_tasks_completed')}</span>
                </div>
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[1.8rem] font-bold text-[var(--cs-primary)] leading-none mb-1">{projectCount}</span>
                  <span className="text-[0.78rem] text-gray-500 text-center">{t('my_tasks_projects')}</span>
                </div>
              </div>
            </div>

            {projectCount > 0 && (
              <div className="text-[0.88rem] text-gray-500 px-1">
                {t('my_tasks_participated', { count: projectCount })}
                {percentage !== null && (
                  <span>{t('my_tasks_percentage', { pct: percentage })}</span>
                )}
              </div>
            )}
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
    </CsPage>
  );
};
