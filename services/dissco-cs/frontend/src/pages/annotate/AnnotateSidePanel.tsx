import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';
import { ForumTopicInput } from '@dissco-cs/shared-types';
import { projectQueries } from '../../api/queries/projects';
import { IconButton } from '../../components/ui/IconButton';
import { ManualContent } from '../../components/manuals/ManualContent';
import { ForumTopicForm } from '../../components/forum/ForumTopicForm';
import { FieldHelp } from './field-help';
import { FieldHelpPanel } from './FieldHelpPanel';
import { ManifestInfo } from './ManifestInfo';
import { AnnotatePanelKind, HelpTarget } from './use-annotate-panel';

const TITLE_KEY: Record<AnnotatePanelKind, string> = {
  help: 'annotate_help_title',
  info: 'annotate_info_title',
  manual: 'annotate_panel_manual',
  forum: 'annotate_forum_button',
};

// The open panel beside the form: a title, a close button and its own scrollbar, so the image and
// the form stay in view while reading.
export function AnnotateSidePanel({ kind, onClose, help, helpTarget, manifestId, projectSlug, projectLabel, onPostForum, onForumDirtyChange }: {
  kind: AnnotatePanelKind;
  onClose: () => void;
  help: FieldHelp;
  helpTarget: HelpTarget | null;
  manifestId: number;
  projectSlug: string;
  projectLabel: string | undefined;
  onPostForum: (data: ForumTopicInput) => void;
  onForumDirtyChange: (isDirty: boolean) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const title = t(TITLE_KEY[kind]);

  return (
    <aside aria-label={title} className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200">
        <h2 className="m-0 text-[0.95rem] font-semibold text-gray-800">{title}</h2>
        <IconButton icon={LuX} label={t('common_close')} onClick={onClose} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 text-[0.88rem]">
        {kind === 'help' && <FieldHelpPanel help={help} target={helpTarget} />}
        {kind === 'info' && <ManifestInfo manifestId={manifestId} />}
        {kind === 'manual' && <ManualPanel projectSlug={projectSlug} />}
        {kind === 'forum' && (
          <ForumTopicForm initialTaskUrl={window.location.href} taskUrlReadOnly fixedProjectLabel={projectLabel} onSubmit={onPostForum} onCancel={onClose} onDirtyChange={onForumDirtyChange} />
        )}
      </div>
    </aside>
  );
}

function ManualPanel({ projectSlug }: { projectSlug: string }) {
  const { t } = useTranslation('dissco-cs');
  const { data: manual, isPending } = useQuery({ ...projectQueries.manual(projectSlug), retry: false, staleTime: 5 * 60 * 1000 });

  if (isPending) {
    return <p className="m-0 text-gray-500">{t('pdp_loading')}</p>;
  }
  return manual ? <ManualContent manual={manual} projectSlug={projectSlug} /> : <p className="m-0 text-gray-500">{t('manual_modal_empty')}</p>;
}
