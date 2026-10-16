import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/layout/CsPage';
import { PageError } from '../../components/layout/PageError';
import { Button } from '../../components/ui/Button';

export type AnnotatePageErrorKind =
  // Not an error: enough volunteers already work on this one -- offer the next task instead.
  | { kind: 'full'; onNext: () => void; isLoadingNext: boolean }
  // Madoc answers 404 when the user may not work on this task.
  | { kind: 'no-access' }
  | { kind: 'load' }
  | { kind: 'no-model' };

const TEXT_KEYS = {
  'no-access': 'annotate_no_access',
  load: 'annotate_error_loading',
  'no-model': 'annotate_no_capture_model',
} as const;

// The annotate page when it cannot show a task, always with a way back to the project.
export function AnnotatePageError({ projectSlug, error }: { projectSlug: string | undefined; error: AnnotatePageErrorKind }) {
  const { t } = useTranslation('dissco-cs');
  const navigate = useNavigate();

  const backToProject = (
    <Button variant="secondary" onClick={() => navigate(`/explore/${projectSlug}`)}>
      {t('annotate_back_to_project')}
    </Button>
  );

  return (
    <CsPage>
      {error.kind === 'full' ? (
        <PageError role="status" title={t('annotate_full_title')} text={t('annotate_full_text')}>
          <Button onClick={error.onNext} loading={error.isLoadingNext}>
            {t('annotate_next_task')}
          </Button>
          {backToProject}
        </PageError>
      ) : (
        <PageError title={t('annotate_error_title')} text={t(TEXT_KEYS[error.kind])}>
          {backToProject}
        </PageError>
      )}
    </CsPage>
  );
}
