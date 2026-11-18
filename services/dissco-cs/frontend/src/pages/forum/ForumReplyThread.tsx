import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { ForumReplyDto, forumReplyInputSchema, MAX_FORUM_BODY_LENGTH } from '@dissco-cs/shared-types';
import { FormField } from '../../components/ui/FormField';
import { useValidatedForm } from '../../hooks/use-validated-form';
import { DeleteIconButton } from '../../components/ui/DeleteIconButton';
import { formatDate } from '../../utility/format-date';
import { inputClass } from '../../components/ui/input-styles';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/layout/QueryState';

// The opened part of a topic: its replies, then a reply box (or a notice when the topic is closed).
export function ForumReplyThread({ replies, closed, canDeleteReply, onDeleteReply, replyDraft, onReplyDraftChange, onSubmitReply }: {
  // The replies query of the opened topic: loading and a load error show in place of the replies.
  replies: { data: ForumReplyDto[] | undefined; errorUpdateCount: number };
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
      <QueryState query={replies}>
        {list => list.length > 0 && (
          <div className="flex flex-col gap-[6px]">
            {list.map(reply => (
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
      </QueryState>
      {closed ? (
        <p className="text-xs text-gray-400 italic mt-1">{t('forum_closed_notice')}</p>
      ) : (
        <ReplyForm draft={replyDraft} onDraftChange={onReplyDraftChange} onSubmit={onSubmitReply} />
      )}
    </div>
  );
}

// The draft lives in the forum page, per topic, so it survives closing and opening the topic; the
// form passes every change on and starts empty again once the page clears the draft after sending.
function ReplyForm({ draft, onDraftChange, onSubmit }: { draft: string; onDraftChange: (body: string) => void; onSubmit: () => void }) {
  const { t } = useTranslation('dissco-cs');
  const form = useValidatedForm(forumReplyInputSchema, { body: draft });
  const { reset, getValues } = form;
  // Only after sending: emptying the field by hand also makes the draft '', and must keep its error.
  useEffect(() => {
    if (draft === '' && getValues('body') !== '') reset({ body: '' });
  }, [draft, reset, getValues]);

  return (
    <form noValidate className="flex flex-col gap-[14px] mt-1" onSubmit={form.handleSubmit(() => onSubmit())}>
      <FormField error={form.errorFor('body')}>
        <textarea
          {...form.field('body', { onChange: e => onDraftChange(e.target.value) })}
          className={inputClass}
          maxLength={MAX_FORUM_BODY_LENGTH}
          placeholder={t('forum_form_placeholder_reply')}
          aria-label={t('forum_form_placeholder_reply')}
          rows={2}
        />
      </FormField>
      <Button type="submit" size="sm" className="self-start">{t('forum_form_submit_reply')}</Button>
    </form>
  );
}
