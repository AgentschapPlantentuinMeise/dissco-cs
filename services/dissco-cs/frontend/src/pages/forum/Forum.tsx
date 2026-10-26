import React from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageSection } from '../../components/layout/PageSection';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ForumTopicForm } from '../../components/forum/ForumTopicForm';
import { isUnread } from '../../components/forum/forum-topics';
import { Button } from '../../components/ui/Button';
import { useForumPage } from './use-forum-page';
import { ForumTopicCard } from './ForumTopicCard';
import { ForumReplyThread } from './ForumReplyThread';
import { ForumToolbar } from './ForumToolbar';
import { Pagination } from '../../components/ui/Pagination';

export function Forum() {
  const { t } = useTranslation('dissco-cs');
  const c = useForumPage();
  const isAdmin = !!c.user?.scope.includes('site.admin');

  return (
    <CsPage>
      <PageHeader
        variant="compact"
        title={t('nav_forum')}
        lead={t('forum_intro')}
        actions={
          <Button variant="on-dark" onClick={() => c.setShowNewForm(v => !v)}>
            {c.showNewForm ? t('common_cancel') : t('forum_btn_new_message')}
          </Button>
        }
      />
      <PageSection>
        {/* The list at a reading width, search and filters in a column next to it (above it on a
            smaller screen): short rows across the full width left a wide gap in the middle. */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,960px)_260px] gap-7 items-start">
          <ForumToolbar
            searchQuery={c.searchQuery}
            onSearchChange={c.setSearchQuery}
            activeFilter={c.activeFilter}
            onFilterChange={c.setActiveFilter}
            counts={c.filterCounts}
            projectLabel={c.projectFilterLabel}
            onClearProject={c.clearProjectFilter}
          />
          <div className="xl:col-start-1 xl:row-start-1 min-w-0 flex flex-col gap-6">
            {c.showNewForm && (
              <ForumTopicForm
                onSubmit={data => c.createTopic(data)}
                onCancel={() => c.setShowNewForm(false)}
                projectOptions={c.projectOptions}
              />
            )}

            {c.displayTopics.length === 0 && !c.showNewForm ? (
              <p className="text-gray-500 text-[0.95rem] text-center py-10 m-0">
                {c.activeFilter || c.searchQuery.trim() || c.projectFilterLabel ? t('forum_empty_search_or_filter') : t('forum_empty_start')}
              </p>
            ) : (
              <div id="forum-list" className="bg-white border-t-[3px] border-cs-primary scroll-mt-[90px]">
                {c.pageTopics.map(topic => (
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
            )}

            <Pagination
              currentPage={c.currentPage}
              totalPages={c.totalPages}
              onChange={page => {
                c.setCurrentPage(page);
                document.getElementById('forum-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              label={t('forum_pagination_label')}
            />
          </div>
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
      </PageSection>
    </CsPage>
  );
}
