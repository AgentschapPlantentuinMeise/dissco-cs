import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/CsPage';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { MessageForm, MessageFormData } from '../../components/messageform/MessageForm';
import { useUser } from '../../hooks/use-current-user';
import { useTranslation } from 'react-i18next';
import { forumApi, ForumTopicWithReplyCount, ForumReply } from '../../api/cs-api';
import { DeleteIconButton } from '../../components/DeleteIconButton';
import { ChevronIcon } from '../../icons/ChevronIcon';
import { ArrowRightIcon } from '../../icons/ArrowRightIcon';
import { SearchIcon } from '../../icons/SearchIcon';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' });

const btnPrimary = 'bg-[var(--cs-primary)] text-white border-none px-[18px] py-[10px] rounded text-[0.95rem] font-medium cursor-pointer transition-colors duration-200 hover:bg-[var(--cs-dark)]';
const btnGhost = 'bg-transparent border border-gray-300 px-3 py-1.5 rounded text-[0.85rem] text-gray-600 cursor-pointer whitespace-nowrap transition-[border-color,color] duration-200 hover:border-[var(--cs-primary)] hover:text-[var(--cs-primary)]';

const filterRowClass = (isActive: boolean) =>
  'block w-full text-left px-[10px] py-2 rounded-md text-[0.85rem] cursor-pointer transition-colors duration-200 ' +
  (isActive
    ? 'bg-[var(--cs-primary)]/10 text-[var(--cs-primary)] font-semibold'
    : 'text-gray-600 hover:bg-gray-100 hover:text-[var(--cs-primary)]');

const inputClass = 'py-[9px] px-3 border border-gray-300 rounded text-[0.95rem] font-[inherit] resize-y transition-colors duration-200 focus:outline-none focus:border-[var(--cs-primary)]';

export const MessageBoard: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const user = useUser();
  const authorName = user?.name || t('forum_meta_author');

  const [topics, setTopics] = useState<ForumTopicWithReplyCount[]>([]);
  const [repliesByTopic, setRepliesByTopic] = useState<Record<string, ForumReply[]>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'mine' | 'unread' | 'unanswered' | null>(null);
  const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const deepLinkTopicId = searchParams.get('topic');
  const didHandleDeepLink = useRef(false);

  useEffect(() => {
    forumApi.listTopics().then(res => {
      setTopics(res.topics);
      return forumApi.visitForum().then(() => {
        window.dispatchEvent(new Event('mb_updated'));
      });
    }).catch(() => setTopics([]));
  }, []);

  // Open het topic uit de ?topic=<id> deep-link (vanaf de dashboard-widget) automatisch, één keer,
  // zodra de topics geladen zijn. De ref voorkomt dat het topic zich meteen weer opent na sluiten.
  useEffect(() => {
    if (didHandleDeepLink.current || !deepLinkTopicId || topics.length === 0) return;
    if (!topics.some(m => m.id === deepLinkTopicId)) return;
    didHandleDeepLink.current = true;

    setExpandedId(deepLinkTopicId);
    forumApi.getTopic(deepLinkTopicId).then(detail => {
      setRepliesByTopic(prev => ({ ...prev, [deepLinkTopicId]: detail.replies }));
      setTopics(prev => prev.map(m =>
        m.id === deepLinkTopicId ? { ...m, last_seen_reply_count: detail.replies.length } : m
      ));
    });
    document.getElementById(`topic-${deepLinkTopicId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [deepLinkTopicId, topics]);

  useEffect(() => {
    window.dispatchEvent(new Event('mb_updated'));
  }, [topics]);

  const isUnread = (msg: ForumTopicWithReplyCount) => {
    const seen = msg.last_seen_reply_count;
    return seen === null || msg.reply_count > seen;
  };

  const sortedTopics = useMemo(() =>
    [...topics].sort((a, b) =>
      new Date(b.last_activity || b.created_at).getTime() -
      new Date(a.last_activity || a.created_at).getTime()
    ), [topics]);

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return sortedTopics;
    const q = searchQuery.toLowerCase();
    return sortedTopics.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q) ||
      m.author_name.toLowerCase().includes(q)
    );
  }, [sortedTopics, searchQuery]);

  const displayTopics = useMemo(() => {
    if (!activeFilter) return filteredTopics;
    if (activeFilter === 'mine') return filteredTopics.filter(m => m.author_user_id === user?.id);
    if (activeFilter === 'unread') return filteredTopics.filter(isUnread);
    if (activeFilter === 'unanswered') return filteredTopics.filter(m => m.reply_count === 0);
    return filteredTopics;
  }, [filteredTopics, activeFilter, user]);

  const handleToggleExpand = (topicId: string) => {
    if (expandedId === topicId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(topicId);
    forumApi.getTopic(topicId).then(detail => {
      setRepliesByTopic(prev => ({ ...prev, [topicId]: detail.replies }));
      setTopics(prev => prev.map(m =>
        m.id === topicId ? { ...m, last_seen_reply_count: detail.replies.length } : m
      ));
    });
  };

  const confirmDeleteTopic = () => {
    if (pendingDeleteTopicId === null) return;
    const topicId = pendingDeleteTopicId;

    forumApi.deleteTopic(topicId).then(() => {
      setTopics(prev => prev.filter(m => m.id !== topicId));
      setPendingDeleteTopicId(null);
    });
  };

  const handleSubmitMessage = (data: MessageFormData) => {
    forumApi.createTopic(data).then(topic => {
      setTopics(prev => [{ ...topic, reply_count: 0, last_seen_reply_count: 0 }, ...prev]);
      setShowNewForm(false);
    });
  };

  const handleSubmitReply = (e: React.FormEvent, topicId: string) => {
    e.preventDefault();
    const body = replyDrafts[topicId] || '';
    if (!body.trim()) return;

    forumApi.createReply(topicId, body).then(reply => {
      setRepliesByTopic(prev => ({ ...prev, [topicId]: [...(prev[topicId] || []), reply] }));
      setTopics(prev => prev.map(m =>
        m.id === topicId
          ? { ...m, reply_count: m.reply_count + 1, last_activity: reply.created_at, last_seen_reply_count: m.reply_count + 1 }
          : m
      ));
      setReplyDrafts(prev => ({ ...prev, [topicId]: '' }));
    });
  };

  return (
    <CsPage>
      <div className="cs-container cs-container--wide pt-10 pb-16">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-4xl text-[var(--cs-primary)] m-0">{t('nav_messageboard')}</h1>
          <button className={btnPrimary} onClick={() => setShowNewForm(v => !v)}>
            {showNewForm ? t('common_cancel') : t('forum_btn_new_message')}
          </button>
        </header>


        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
          <div className="order-2 lg:order-1 min-w-0">
            {showNewForm && (
              <MessageForm
                onSubmit={handleSubmitMessage}
                onCancel={() => setShowNewForm(false)}
              />
            )}

            {displayTopics.length === 0 && !showNewForm && (
              <p className="text-gray-500 text-[0.95rem] text-center py-10">
                {activeFilter || searchQuery.trim()
                  ? t('forum_empty_search_or_filter')
                  : t('forum_empty_start')}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {displayTopics.map((msg: ForumTopicWithReplyCount) => {
                const unread = isUnread(msg);
                const replies = repliesByTopic[msg.id] || [];
                return (
                  <div key={msg.id} id={`topic-${msg.id}`} className={`flex bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 ${unread ? 'border-l-[var(--cs-secondary)]' : 'border-l-transparent'} px-4 py-3.5`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <div className="min-w-0">
                          <h3 className={`m-0 mb-[2px] text-[0.95rem] text-[var(--cs-primary)] flex items-center gap-[6px] ${unread ? 'font-bold' : 'font-medium'}`}>
                            {unread && <span className="inline-block w-2 h-2 rounded-full bg-[var(--cs-secondary)] flex-shrink-0" aria-label="nieuw" />}
                            {msg.title}
                          </h3>
                          <span className="text-xs text-gray-400">{msg.author_name} · {formatDate(msg.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button className={`${btnGhost} flex items-center gap-1`} onClick={() => handleToggleExpand(msg.id)}>
                            {msg.reply_count > 0
                              ? msg.reply_count === 1
                                ? `${msg.reply_count} ${t('forum_btn_replies_one')}`
                                : `${msg.reply_count} ${t('forum_btn_replies_many')}`
                              : t('forum_btn_reply')}
                            <ChevronIcon className={`transition-transform duration-200 ${expandedId === msg.id ? 'rotate-180' : ''}`} />
                          </button>
                          {user?.scope.includes('site.admin') && (
                            <DeleteIconButton onClick={() => setPendingDeleteTopicId(msg.id)} />
                          )}
                        </div>
                      </div>

                      <p className="text-[0.9rem] text-[#555] leading-[1.4] my-1 mb-[6px] line-clamp-2">{msg.body}</p>

                      {msg.task_url && (
                        <a href={msg.task_url} className="inline-flex items-center gap-1 text-[0.85rem] text-[var(--cs-primary)] no-underline mb-1 hover:underline" target="_blank" rel="noopener noreferrer">
                          {t('forum_view_task')} <ArrowRightIcon aria-hidden="true" />
                        </a>
                      )}

                      {expandedId === msg.id && (
                        <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
                          {replies.length > 0 && (
                            <div className="flex flex-col gap-[6px]">
                              {replies.map(reply => (
                                <div key={reply.id} className="bg-gray-50 border-l-[3px] border-[var(--cs-primary)] rounded-r-[6px] py-2 px-3 ml-2">
                                  <span className="text-xs text-gray-400">{reply.author_name} · {formatDate(reply.created_at)}</span>
                                  <p className="m-0 mt-1 text-[0.9rem] text-gray-800 leading-[1.5]">{reply.body}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <form className="flex flex-col gap-[14px] mt-1" onSubmit={e => handleSubmitReply(e, msg.id)}>
                            <textarea
                              className={inputClass}
                              value={replyDrafts[msg.id] || ''}
                              onChange={e => setReplyDrafts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                              placeholder={t('forum_form_placeholder_reply')}
                              rows={2}
                              required
                            />
                            <button type="submit" className={btnPrimary}>{t('forum_form_submit_reply')}</button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="order-1 lg:order-2 flex flex-col gap-6 lg:sticky lg:top-[90px]">
            <div className="relative">
              <SearchIcon className="absolute left-[11px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                className={`${inputClass} w-full pl-9 box-border`}
                type="search"
                placeholder={t('forum_search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 m-0 mb-3">{t('forum_filters_heading')}</p>
              <div className="flex flex-col gap-1">
                {(['mine', 'unread', 'unanswered'] as const).map(f => (
                  <button
                    key={f}
                    className={filterRowClass(activeFilter === f)}
                    onClick={() => setActiveFilter((cur: typeof activeFilter) => cur === f ? null : f)}
                  >
                    {f === 'mine' ? t('forum_filter_mine') : f === 'unread' ? t('forum_filter_unread') : t('forum_filter_unanswered')}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {pendingDeleteTopicId !== null && (
          <ConfirmDialog
            message={t('forum_confirm_delete')}
            confirmLabel={t('common_delete')}
            cancelLabel={t('common_cancel')}
            onConfirm={confirmDeleteTopic}
            onCancel={() => setPendingDeleteTopicId(null)}
          />
        )}
      </div>
    </CsPage>
  );
};
