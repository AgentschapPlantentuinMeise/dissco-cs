import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ForumTopicDto } from '@dissco-cs/shared-types';
import { DeleteIconButton } from '../../components/ui/DeleteIconButton';
import { formatDate } from '../../utility/format-date';
import { LuChevronDown, LuUser, LuClock, LuFolder, LuLink, LuCheck } from 'react-icons/lu';
import { btnGhost } from './forum-styles';

// One topic in the list: title with unread/closed markers, actions, meta line and body. When open,
// `thread` (replies and reply box) is shown below the body.
export const ForumTopicCard: React.FC<{
  topic: ForumTopicDto;
  unread: boolean;
  isExpanded: boolean;
  // Admin or the topic's author: may close and delete it.
  canModerate: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
  thread: React.ReactNode;
}> = ({ topic, unread, isExpanded, canModerate, onToggle, onClose, onDelete, thread }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const closed = !!topic.closedAt;
  const replyCountLabel = `${topic.replyCount} ${t(topic.replyCount === 1 ? 'forum_btn_replies_one' : 'forum_btn_replies_many')}`;

  return (
    <div id={`topic-${topic.id}`} className={`flex bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 ${unread ? 'border-l-[var(--cs-secondary)]' : 'border-l-transparent'} px-4 py-3.5`}>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3 mb-1">
          {/* Clicking the title/meta/body reads the full message — same toggle as
              "Antwoord", so opening it to just read doesn't require hitting the
              reply button specifically. */}
          <div className="min-w-0 flex-1 cursor-pointer" onClick={onToggle}>
            <h3 className={`m-0 text-[0.95rem] text-[var(--cs-primary)] flex items-center gap-[6px] min-w-0 ${unread ? 'font-bold' : 'font-medium'}`}>
              {unread && <span className="inline-block w-2 h-2 rounded-full bg-[var(--cs-secondary)] flex-shrink-0" aria-label={t('forum_unread_label')} />}
              {topic.title}
              {closed && (
                <span className="text-[0.68rem] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
                  {t('forum_closed_badge')}
                </span>
              )}
            </h3>
          </div>
          {/* Reply stays last so it always sits flush against the card's right
              edge — the context actions before it (close/delete) vary per row
              (owner/admin, open/closed), so those are the ones that shift, not the
              button people click most often. */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canModerate && !closed && (
              <button
                onClick={onClose}
                aria-label={t('forum_btn_close')}
                title={t('forum_btn_close')}
                className="bg-transparent border-none cursor-pointer text-gray-600 text-base px-1 flex items-center hover:text-[var(--cs-primary)] transition-colors duration-200"
              >
                <LuCheck />
              </button>
            )}
            {canModerate && <DeleteIconButton onClick={onDelete} />}
            {/* A closed topic allows no further action, so it gets no button: just a
                muted reply count (clickable like the title/body), or nothing at all
                when there are no replies. */}
            {closed ? (
              topic.replyCount > 0 && (
                <span className="text-xs text-gray-400 cursor-pointer whitespace-nowrap" onClick={onToggle}>
                  {replyCountLabel}
                </span>
              )
            ) : (
              <button className={`${btnGhost} flex items-center gap-1`} onClick={onToggle}>
                {topic.replyCount > 0 ? replyCountLabel : t('forum_btn_reply')}
                <LuChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Fixed order (who → when → about which project → which task) so every card
            reads the same regardless of which fields it has. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 mb-1.5 cursor-pointer" onClick={onToggle}>
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <LuUser aria-hidden="true" className="text-gray-300" /> {topic.authorName}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <LuClock aria-hidden="true" className="text-gray-300" /> {formatDate(topic.createdAt, i18n.language)}
          </span>
          {topic.projectSlug && (
            <Link
              to={`/explore/${topic.projectSlug}`}
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cs-primary)] no-underline hover:underline"
            >
              <LuFolder aria-hidden="true" /> {topic.projectLabel || topic.projectSlug}
            </Link>
          )}
          {topic.taskUrl && (
            <a
              href={topic.taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-[var(--cs-primary)] no-underline hover:underline"
            >
              <LuLink aria-hidden="true" /> {t('forum_view_task')}
            </a>
          )}
        </div>

        <p
          className={`text-[0.9rem] text-[#555] leading-[1.4] my-1 mb-[6px] whitespace-pre-line cursor-pointer ${isExpanded ? '' : 'line-clamp-2'}`}
          onClick={onToggle}
        >
          {topic.body}
        </p>

        {isExpanded && thread}
      </div>
    </div>
  );
};
