import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackKeys, feedbackQueries } from '../../api/queries/feedback';
import { feedbackApi } from '../../api/cs-client/feedback';
import { Button } from '../../components/ui/Button';

// An opened feedback thread: its messages and a reply box.
export function FeedbackThreadDetail({ threadId }: { threadId: number }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [replyBody, setReplyBody] = useState('');

  const queryClient = useQueryClient();
  const { data, status, dataUpdatedAt } = useQuery(feedbackQueries.thread(threadId));
  // Opening a thread marks it read on the server -- refresh only the thread list (and with it the
  // navbar badge), never this thread itself, or each refetch would retrigger this effect.
  useEffect(() => {
    if (dataUpdatedAt) {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.threads() });
    }
  }, [dataUpdatedAt, queryClient]);

  const { mutate: postReply, status: replyStatus } = useMutation({
    mutationFn: (body: string) => feedbackApi.createReply(threadId, body),
    onSuccess: () => {
      setReplyBody('');
      queryClient.invalidateQueries({ queryKey: feedbackKeys.all });
    },
    meta: { errorMessage: 'error_send_failed' },
  });

  if (status === 'pending') {
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
              <strong className="text-gray-800">{message.authorName}</strong>
              <span className="text-xs text-gray-400">{new Date(message.createdAt).toLocaleString(i18n.language)}</span>
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
          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-cs-primary"
        />
        <Button
          size="sm"
          onClick={() => replyBody.trim() && postReply(replyBody.trim())}
          disabled={!replyBody.trim()}
          loading={replyStatus === 'pending'}
        >
          {t('dashboard_feedback_reply_send')}
        </Button>
      </div>
    </div>
  );
}
