import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/layout/CsPage';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageSection } from '../../components/layout/PageSection';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { SectionLoadError } from '../../components/layout/SectionLoadError';
import { FeedbackThreadRow } from './FeedbackThreadRow';
import { MyTasksSection } from './MyTasksSection';
import { YourYear } from './YourYear';
import { InstitutionsHelped } from './InstitutionsHelped';
import { ForumCallout } from './ForumCallout';
import { useUserDashboard } from './use-user-dashboard';
import { useSiteName } from '../../hooks/use-site-name';

// The personal dashboard (style guide, prototype "Dashboard"): my tasks, feedback from reviewers,
// the user's year, and the institutions they helped with a call to the forum's open questions.
export function UserDashboard() {
  const { t, i18n } = useTranslation('dissco-cs');
  const platformName = useSiteName();
  const { user, summary, percentage, tasksLoading, tasksError, list, year, helpedInstitutions, unansweredCount, feedback, release } =
    useUserDashboard();

  // The route sits behind <AuthGate>, which already sends a visitor without a session to login.
  if (!user) return null;

  // The header, the task list, the year and the institutions are all counted from the tasks:
  // without them every section would show zero.
  if (tasksError) {
    return <PageLoadError />;
  }

  return (
    <CsPage>
      <PageHeader
        variant="compact"
        title={t('dashboard_welcome', { name: user.name })}
        lead={percentage !== null ? t('my_tasks_percentage', { pct: percentage, platformName }) : t('dashboard_subtitle', { platformName })}
        stats={[
          { value: summary.contributedTasks.length, label: t('my_tasks_total') },
          { value: summary.doneTasks.length, label: t('my_tasks_completed') },
          { value: summary.projectCount, label: t('my_tasks_projects') },
        ]}
      />

      <MyTasksSection list={list} summary={summary} userName={user.name} loading={tasksLoading} onRelease={release.ask} />

      <PageSection
        tone="white"
        title={
          <span className="inline-flex items-center gap-2.5">
            {t('dashboard_feedback_title')}
            {feedback.unread > 0 && (
              <span className="text-[0.8rem] font-semibold text-white bg-cs-secondary rounded-full px-2 py-px tabular-nums">{feedback.unread}</span>
            )}
          </span>
        }
        intro={t('dashboard_feedback_intro')}
      >
        {feedback.loading ? (
          <p className="text-center py-10 text-gray-500 m-0">{t('my_tasks_loading')}</p>
        ) : feedback.error ? (
          <SectionLoadError />
        ) : feedback.threads.length === 0 ? (
          <p className="text-gray-500 m-0">{t('dashboard_feedback_empty')}</p>
        ) : (
          <ul className="list-none m-0 p-0">
            {feedback.threads.map(thread => (
              <FeedbackThreadRow
                key={thread.id}
                thread={thread}
                isOpen={feedback.openThreadId === thread.id}
                onToggle={() => feedback.toggleThread(thread.id)}
                language={i18n.language}
              />
            ))}
          </ul>
        )}
      </PageSection>

      <YourYear months={year.months} first={year.first} doneCount={year.doneCount} />

      <InstitutionsHelped helped={helpedInstitutions}>
        <ForumCallout count={unansweredCount} />
      </InstitutionsHelped>

      {release.target && (
        <ConfirmDialog
          title={t('my_tasks_release_confirm_title')}
          message={t('my_tasks_release_confirm')}
          confirmLabel={t('my_tasks_release')}
          cancelLabel={t('common_cancel')}
          onConfirm={release.confirm}
          onCancel={release.cancel}
        />
      )}
    </CsPage>
  );
}
