import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/Modal';
import { MailIcon } from '../../icons/MailIcon';
import { localeText } from '../../utility/locale-text';
import { FeedbackComposeTarget } from './useReviewTasksController';

interface ReviewFeedbackModalProps {
  target: FeedbackComposeTarget;
  onSend: (body: string) => void;
  onClose: () => void;
  sending: boolean;
  error: string | null;
}

export function ReviewFeedbackModal({ target, onSend, onClose, sending, error }: ReviewFeedbackModalProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [body, setBody] = useState('');

  const submit = () => {
    if (!body.trim() || sending) return;
    onSend(body.trim());
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      eyebrow={t('review_feedback_modal_eyebrow')}
      title={t('review_feedback_modal_title', { name: target.submitterName })}
      footer={
        <div className="flex items-center justify-end gap-3">
          {error && <span className="mr-auto text-[0.78rem] text-red-600">{error}</span>}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50"
          >
            {t('common_cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!body.trim() || sending}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-none text-white cursor-pointer bg-[var(--cs-tertiary)] hover:brightness-90 disabled:opacity-50"
          >
            <MailIcon aria-hidden="true" />
            {sending ? t('review_feedback_sending') : t('review_feedback_send')}
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-4">
        {target.tasks.map(task => (
          <span
            key={task.originalTaskId}
            className="inline-block text-[0.7rem] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
          >
            {localeText(task.subjectLabel, i18n.language) || task.originalTaskId}
          </span>
        ))}
      </div>
      <label htmlFor="review-feedback-body" className="block text-[0.78rem] font-semibold text-gray-600 mb-2">
        {t('review_feedback_body_label')}
      </label>
      <textarea
        id="review-feedback-body"
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        autoFocus
        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[var(--cs-primary)]"
      />
    </Modal>
  );
}
