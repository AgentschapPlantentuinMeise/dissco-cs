import React from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/layout/CsPage';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ForumTopicForm } from '../../components/forum/ForumTopicForm';
import { isUnread } from './forum-topics';
import { btnPrimary } from './forum-styles';
import { useForumPage } from './use-forum-page';
import { ForumTopicCard } from './ForumTopicCard';
import { ForumReplyThread } from './ForumReplyThread';
import { ForumSidebar } from './ForumSidebar';

export function Forum() {
  const { t } = useTranslation('dissco-cs');
  const c = useForumPage();
  const isAdmin = !!c.user?.scope.includes('site.admin');

  return (
    <CsPage>
      <div className="cs-container cs-container--wide pt-10 pb-16">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-4xl text-[var(--cs-primary)] m-0">{t('nav_forum')}</h1>
          <button className={btnPrimary} onClick={() => c.setShowNewForm(v => !v)}>
            {c.showNewForm ? t('common_cancel') : t('forum_btn_new_message')}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
          <div className="order-2 lg:order-1 min-w-0">
            {c.showNewForm && (
              <ForumTopicForm
                onSubmit={data => c.createTopic(data)}
                onCancel={() => c.setShowNewForm(false)}
                projectOptions={c.projectOptions}
              />
            )}

            {c.displayTopics.length === 0 && !c.showNewForm && (
              <p className="text-gray-500 text-[0.95rem] text-center py-10">
                {c.activeFilter || c.searchQuery.trim() ? t('forum_empty_search_or_filter') : t('forum_empty_start')}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {c.displayTopics.map(topic => (
                <ForumTopicCard
                  key={topic.id}
                  topic={topic}
                  unread={isUnread(topic)}
                  isExpanded={c.expandedId === topic.id}
                  canModerate={isAdmin || c.user?.id === topic.authorUserId}
                  onToggle={() => c.toggleExpand(topic.id)}
                  onClose={() => c.setPendingCloseTopicId(topic.id)}
                  onDelete={() => c.setPendingDeleteTopicId(topic.id)}
                  thread={
                    <ForumReplyThread
                      replies={c.expandedReplies}
                      closed={!!topic.closedAt}
                      canDeleteReply={reply => isAdmin || c.user?.id === reply.authorUserId}
                      onDeleteReply={reply => c.setPendingDeleteReply({ topicId: topic.id, replyId: reply.id })}
                      replyDraft={c.replyDrafts[topic.id] || ''}
                      onReplyDraftChange={body => c.setReplyDraft(topic.id, body)}
                      onSubmitReply={() => c.submitReply(topic.id)}
                    />
                  }
                />
              ))}
            </div>
          </div>

          <ForumSidebar
            searchQuery={c.searchQuery}
            onSearchChange={c.setSearchQuery}
            activeFilter={c.activeFilter}
            onFilterChange={c.setActiveFilter}
          />
        </div>

        {c.pendingDeleteTopicId !== null && (
          <ConfirmDialog
            title={t('forum_confirm_delete_title')}
            message={t('forum_confirm_delete')}
            confirmLabel={t('common_delete')}
            cancelLabel={t('common_cancel')}
            onConfirm={c.confirmDeleteTopic}
            onCancel={() => c.setPendingDeleteTopicId(null)}
          />
        )}

        {c.pendingDeleteReply !== null && (
          <ConfirmDialog
            title={t('forum_confirm_delete_reply_title')}
            message={t('forum_confirm_delete_reply')}
            confirmLabel={t('common_delete')}
            cancelLabel={t('common_cancel')}
            onConfirm={c.confirmDeleteReply}
            onCancel={() => c.setPendingDeleteReply(null)}
          />
        )}

        {c.pendingCloseTopicId !== null && (
          <ConfirmDialog
            title={t('forum_confirm_close_title')}
            message={t('forum_confirm_close')}
            confirmLabel={t('forum_btn_close')}
            cancelLabel={t('common_cancel')}
            tone="affirm"
            onConfirm={c.confirmCloseTopic}
            onCancel={() => c.setPendingCloseTopicId(null)}
          />
        )}
      </div>
    </CsPage>
  );
}
