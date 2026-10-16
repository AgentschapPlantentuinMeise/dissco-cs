import { useTranslation } from 'react-i18next';
import { ForumReplyDto } from '@dissco-cs/shared-types';
import { DeleteIconButton } from '../../components/ui/DeleteIconButton';
import { formatDate } from '../../utility/format-date';
import { btnPrimary, inputClass } from './forum-styles';

// The opened part of a topic: its replies, then a reply box (or a notice when the topic is closed).
export function ForumReplyThread({ replies, closed, canDeleteReply, onDeleteReply, replyDraft, onReplyDraftChange, onSubmitReply }: {
  replies: ForumReplyDto[];
  closed: boolean;
  // Admins may delete any reply, others only their own.
  canDeleteReply: (reply: ForumReplyDto) => boolean;
  onDeleteReply: (reply: ForumReplyDto) => void;
  replyDraft: string;
  onReplyDraftChange: (body: string) => void;
  onSubmitReply: () => void;
}) {
  const { t, i18n } = useTranslation('dissco-cs');

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
      {replies.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          {replies.map(reply => (
            <div key={reply.id} className="flex items-start justify-between gap-2 bg-gray-50 border-l-[3px] border-cs-primary rounded-r-[6px] py-2 px-3 ml-2">
              <div className="min-w-0">
                <span className="text-xs text-gray-400">{reply.authorName} · {formatDate(reply.createdAt, i18n.language)}</span>
                <p className="m-0 mt-1 text-[0.9rem] text-gray-800 leading-[1.5] whitespace-pre-line">{reply.body}</p>
              </div>
              {canDeleteReply(reply) && <DeleteIconButton onClick={() => onDeleteReply(reply)} />}
            </div>
          ))}
        </div>
      )}
      {closed ? (
        <p className="text-xs text-gray-400 italic mt-1">{t('forum_closed_notice')}</p>
      ) : (
        <form
          className="flex flex-col gap-[14px] mt-1"
          onSubmit={e => {
            e.preventDefault();
            onSubmitReply();
          }}
        >
          <textarea
            className={inputClass}
            value={replyDraft}
            onChange={e => onReplyDraftChange(e.target.value)}
            placeholder={t('forum_form_placeholder_reply')}
            rows={2}
            required
          />
          <button type="submit" className={btnPrimary}>{t('forum_form_submit_reply')}</button>
        </form>
      )}
    </div>
  );
}
