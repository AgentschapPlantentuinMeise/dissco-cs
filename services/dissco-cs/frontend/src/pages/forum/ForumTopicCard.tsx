import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ForumTopicDto } from '@dissco-cs/shared-types';
import { DeleteIconButton } from '../../components/ui/DeleteIconButton';
import { Button } from '../../components/ui/Button';
import { CardStat } from '../../components/ui/CardStat';
import { formatDate, formatTimeAgo } from '../../utility/format-date';
import { LuCheck } from 'react-icons/lu';


// One topic as a row of the forum list: unread dot, title (with "closed"), a meta line, one line of
// the body, and on the right only the number of replies and when the last one came. When open, the
// full body, `thread` (replies and reply box) and -- for its author or an admin -- close and delete.
export function ForumTopicCard({ topic, unread, isExpanded, canModerate, onToggle, onClose, onDelete, thread }: {
  topic: ForumTopicDto;
  unread: boolean;
  isExpanded: boolean;
  // Admin or the topic's author: may close and delete it.
  canModerate: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
  thread: React.ReactNode;
}) {
  const { t, i18n } = useTranslation('dissco-cs');
  const closed = !!topic.closedAt;

  return (
    <div
      id={`topic-${topic.id}`}
      className={`grid grid-cols-[10px_minmax(0,1fr)_auto] max-sm:grid-cols-[10px_minmax(0,1fr)] gap-x-3.5 gap-y-1 px-[18px] py-4 border-b border-gray-100 ${isExpanded ? 'bg-cs-primary/[0.03]' : ''}`}
    >
      <span
        className={`w-2 h-2 rounded-full mt-[7px] ${unread ? 'bg-cs-secondary' : ''}`}
        aria-label={unread ? t('forum_unread_label') : undefined}
      />

      {/* Clicking the title, meta line or body opens the topic -- the same toggle as the reply
          button, so reading a topic doesn't require hitting that button specifically. */}
      <div className="min-w-0 cursor-pointer" onClick={onToggle}>
        <h3 className={`m-0 text-base text-cs-primary flex flex-wrap items-center gap-x-2 gap-y-1 ${unread ? 'font-bold' : 'font-medium'}`}>
          {topic.title}
          {closed && (
            <span className="text-[0.68rem] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{t('forum_closed_badge')}</span>
          )}
        </h3>
        {/* Fixed order (who, when, which project, which task), so every row reads the same. */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-[3px] text-[0.78rem] text-gray-500">
          <span>{topic.authorName}</span>
          <span>{formatDate(topic.createdAt, i18n.language)}</span>
          {topic.projectSlug && (
            <Link
              to={`/explore/${topic.projectSlug}`}
              onClick={e => e.stopPropagation()}
              className="font-semibold text-cs-primary no-underline hover:underline"
            >
              {topic.projectLabel || topic.projectSlug}
            </Link>
          )}
          {topic.taskUrl && (
            <a
              href={topic.taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="font-semibold text-cs-primary no-underline hover:underline"
            >
              {t('forum_view_task')}
            </a>
          )}
        </div>
      </div>

      {/* The number of replies opens the topic, like the title: there is no separate reply button.
          Without replies the right side stays empty. */}
      {topic.replyCount > 0 ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="row-span-2 max-sm:row-span-1 max-sm:col-start-2 bg-transparent border-none p-0 cursor-pointer flex flex-col items-end max-sm:items-start gap-0.5 min-w-[96px] text-right max-sm:text-left"
        >
          <span className="text-[0.86rem] text-gray-600 whitespace-nowrap">
            <CardStat value={topic.replyCount} label={t('forum_reply_count', { count: topic.replyCount })} />
          </span>
          <span className="text-[0.72rem] text-gray-500 whitespace-nowrap">
            {closed ? t('forum_closed_badge').toLowerCase() : formatTimeAgo(topic.lastActivity, i18n.language)}
          </span>
        </button>
      ) : (
        <span className="row-span-2 max-sm:hidden min-w-[96px]" />
      )}

      <p
        className={`col-start-2 m-0 mt-1 text-[0.88rem] text-gray-600 leading-[1.45] whitespace-pre-line cursor-pointer ${isExpanded ? '' : 'line-clamp-1'}`}
        onClick={onToggle}
      >
        {topic.body}
      </p>

      {isExpanded && (
        <div className="col-start-2 col-span-2 max-sm:col-span-1">
          {thread}
          {canModerate && (
            <div className="flex gap-2 mt-2">
              {!closed && (
                <Button variant="text" size="sm" onClick={onClose}>
                  <LuCheck aria-hidden="true" /> {t('forum_btn_close')}
                </Button>
              )}
              <DeleteIconButton onClick={onDelete} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
