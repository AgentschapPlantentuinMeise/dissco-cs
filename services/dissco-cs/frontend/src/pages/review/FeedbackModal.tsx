import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { CancelButton } from '../../components/ui/CancelButton';
import { DiscardDialog } from '../../components/ui/DiscardDialog';
import { LuMail } from 'react-icons/lu';
import { FeedbackComposeTarget } from './use-review-page';
import { useDiscardGuard } from '../../hooks/use-discard-guard';
import { inputClass } from '../../components/ui/input-styles';
import { MAX_FEEDBACK_BODY_LENGTH, MAX_FEEDBACK_SUBJECT_LENGTH } from '@dissco-cs/shared-types';

interface FeedbackModalProps {
  target: FeedbackComposeTarget;
  onSend: (subject: string, body: string) => void;
  onClose: () => void;
  sending: boolean;
}

export function FeedbackModal({ target, onSend, onClose, sending }: FeedbackModalProps) {
  const { t } = useTranslation('dissco-cs');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const discardGuard = useDiscardGuard(!!subject.trim() || !!body.trim());
  const close = () => discardGuard.guard(onClose);

  const canSend = !!subject.trim() && !!body.trim() && !sending;

  const submit = () => {
    if (!canSend) return;
    onSend(subject.trim(), body.trim());
  };

  return (
    <>
    <Modal
      open
      onClose={close}
      size="md"
      eyebrow={t('feedback_modal_eyebrow')}
      title={t('feedback_modal_title', { name: target.submitterName })}
      footer={
        <div className="flex items-center justify-end gap-3">
          <CancelButton onClick={close} />
          <Button variant="tertiary" size="sm" onClick={submit} disabled={!canSend} loading={sending}>
            {!sending && <LuMail aria-hidden="true" />}
            {sending ? t('feedback_sending') : t('feedback_send')}
          </Button>
        </div>
      }
    >
      <label htmlFor="feedback-subject" className="block text-[0.78rem] font-semibold text-gray-600 mb-2">
        {t('feedback_subject_label')}
      </label>
      <input
        id="feedback-subject"
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        maxLength={MAX_FEEDBACK_SUBJECT_LENGTH}
        placeholder={t('feedback_subject_placeholder')}
        autoFocus
        className={`${inputClass} w-full mb-4`}
      />
      <label htmlFor="feedback-body" className="block text-[0.78rem] font-semibold text-gray-600 mb-2">
        {t('feedback_body_label')}
      </label>
      <textarea
        id="feedback-body"
        value={body}
        onChange={e => setBody(e.target.value)}
        maxLength={MAX_FEEDBACK_BODY_LENGTH}
        rows={4}
        className={`${inputClass} w-full`}
      />
    </Modal>
    <DiscardDialog guard={discardGuard} />
    </>
  );
}
