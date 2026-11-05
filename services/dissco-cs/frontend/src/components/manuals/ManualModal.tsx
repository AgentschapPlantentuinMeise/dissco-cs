import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { projectsApi } from '../../api/cs-client/projects';
import { useProjectManual } from '../../hooks/use-project-manual';
import { siteLangText } from '../../utility/site-lang-text';
import { ManualContent } from './ManualContent';
import { attachmentLang } from './manual-sections';
import { PdfGallery } from './PdfGallery';

type ManualModalProps = {
  projectSlug: string;
  projectLabel?: string;
  open: boolean;
  onClose: () => void;
  onShown?: () => void;
};

export function ManualModal({
  projectSlug,
  projectLabel,
  open,
  onClose,
  onShown,
}: ManualModalProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: manual } = useProjectManual(projectSlug);

  const shownRef = useRef(false);

  useEffect(() => {
    if (open && manual && !shownRef.current) {
      shownRef.current = true;
      onShown?.();
    }
    if (!open) {
      shownRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, manual]);

  if (!open || !manual) {
    return null;
  }

  const content = siteLangText(manual.content, i18n.language, '');
  const lang = attachmentLang(manual, i18n.language);
  const attachment = manual.attachments?.[lang];

  // Only a PDF, no text: the modal (title and an empty-sections message) adds nothing, so open the
  // gallery on page 1 right away.
  if (attachment?.mimeType === 'application/pdf' && content.trim().length === 0) {
    return <PdfGallery url={projectsApi.manualAttachmentUrl(projectSlug, lang)} filename={attachment.filename} openDirectly onClose={onClose} />;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={t('manual_modal_eyebrow')}
      title={projectLabel || siteLangText(manual.title, i18n.language, '')}
      size="lg"
    >
      <ManualContent manual={manual} projectSlug={projectSlug} />
    </Modal>
  );
}
