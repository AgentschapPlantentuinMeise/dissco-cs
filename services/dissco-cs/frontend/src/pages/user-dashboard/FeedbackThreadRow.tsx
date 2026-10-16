import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackKeys } from '../../api/queries/feedback';
import { feedbackApi } from '../../api/cs-client/feedback';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LuTrash2 } from 'react-icons/lu';
import { FeedbackThreadDto } from '@dissco-cs/shared-types';
import { FeedbackThreadDetail } from './FeedbackThreadDetail';

// One feedback thread in the dashboard's feedback tab; click to open it, trash icon to delete it.
export function FeedbackThreadRow({
  thread,
  isOpen,
  onToggle,
  language,
}: {
  thread: FeedbackThreadDto;
  isOpen: boolean;
  onToggle: () => void;
  language: string;
}) {
  const { t } = useTranslation('dissco-cs');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const otherName = thread.role === 'recipient' ? thread.reviewerName : thread.recipientName;
  const directionLabel =
    thread.role === 'recipient'
      ? t('dashboard_feedback_from', { name: otherName })
      : t('dashboard_feedback_to', { name: otherName });

  const queryClient = useQueryClient();
  const { mutate: deleteThread } = useMutation({
    mutationFn: () => feedbackApi.deleteThread(thread.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.threads() });
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  return (
    <li className="border-b border-gray-200 last:border-b-0 py-3">
      <div className="flex items-start gap-2">
        <button onClick={onToggle} className="flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer p-0">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              {thread.unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--cs-tertiary)' }} />
              )}
              {thread.subject}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">{new Date(thread.lastActivity).toLocaleString(language)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{directionLabel}</div>
        </button>
        <button
          onClick={() => setConfirmingDelete(true)}
          aria-label={t('dashboard_feedback_delete_label')}
          title={t('dashboard_feedback_delete_label')}
          className="flex-shrink-0 bg-transparent border-none text-gray-600 cursor-pointer hover:text-cs-primary transition-colors duration-200 p-1"
        >
          <LuTrash2 />
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
