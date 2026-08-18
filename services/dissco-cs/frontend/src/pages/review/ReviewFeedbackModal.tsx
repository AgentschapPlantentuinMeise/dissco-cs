import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/Modal';
import { MailIcon } from '../../icons/MailIcon';
import { FeedbackComposeTarget } from './useReviewTasksController';

interface ReviewFeedbackModalProps {
  target: FeedbackComposeTarget;
  onSend: (subject: string, body: string) => void;
  onClose: () => void;
  sending: boolean;
  error: string | null;
}

export function ReviewFeedbackModal({ target, onSend, onClose, sending, error }: ReviewFeedbackModalProps) {
  const { t } = useTranslation('dissco-cs');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const canSend = !!subject.trim() && !!body.trim() && !sending;

  const submit = () => {
    if (!canSend) return;
    onSend(subject.trim(), body.trim());
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
            disabled={!canSend}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-none text-white cursor-pointer bg-[var(--cs-tertiary)] hover:brightness-90 disabled:opacity-50"
          >
            <MailIcon aria-hidden="true" />
            {sending ? t('review_feedback_sending') : t('review_feedback_send')}
          </button>
        </div>
      }
    >
      <label htmlFor="review-feedback-subject" className="block text-[0.78rem] font-semibold text-gray-600 mb-2">
        {t('review_feedback_subject_label')}
      </label>
      <input
        id="review-feedback-subject"
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder={t('review_feedback_subject_placeholder')}
        autoFocus
        className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:border-[var(--cs-primary)]"
      />
      <label htmlFor="review-feedback-body" className="block text-[0.78rem] font-semibold text-gray-600 mb-2">
        {t('review_feedback_body_label')}
      </label>
      <textarea
        id="review-feedback-body"
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[var(--cs-primary)]"
      />
    </Modal>
  );
}
