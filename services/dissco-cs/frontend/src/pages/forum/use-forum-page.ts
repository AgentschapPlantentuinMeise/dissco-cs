import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { projectQueries } from '../../api/queries/projects';
import { forumKeys, forumQueries } from '../../api/queries/forum';
import { forumApi } from '../../api/cs-client/forum';
import { reportClientError } from '../../api/cs-client/client-errors';
import { useCurrentUser } from '../../hooks/use-current-user';
import { localeText } from '../../utility/locale-text';
import { MadocProjectDto, ForumTopicDto, ForumReplyDto, ForumTopicInput } from '@dissco-cs/shared-types';
import { ForumFilter, filterTopics, sortByLastActivity, withReplyAdded, withReplyRemoved } from './forum-topics';

// Everything the forum page does: topics and replies from the cache, search and filters, the
// open topic, reply drafts, the three confirm dialogs and the writes.
export function useForumPage() {
  const { i18n } = useTranslation('dissco-cs');
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: allProjects } = useQuery({
    ...projectQueries.listAll({ published: true }),
    staleTime: 5 * 60 * 1000,
  });
  const projectOptions = useMemo(
    () => (allProjects || []).map((p: MadocProjectDto) => ({ slug: p.slug, label: localeText(p.label, i18n.language) })),
    [allProjects, i18n.language]
  );

  const topicsQuery = useQuery(forumQueries.topics());
  const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);
  // Local edits (delete, close, reply, mark seen) go straight into the shared cache instead of a
  // separate copy in component state.
  const setTopics = useCallback(
    (update: (prev: ForumTopicDto[]) => ForumTopicDto[]) =>
      queryClient.setQueryData(forumQueries.topics().queryKey, old => (old ? update(old) : old)),
    [queryClient]
  );
  const updateTopic = (topicId: number, update: (topic: ForumTopicDto) => ForumTopicDto) =>
    setTopics(prev => prev.map(m => (m.id === topicId ? update(m) : m)));

  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: expandedReplies } = useQuery(forumQueries.replies(expandedId));
  const setReplies = (topicId: number, update: (prev: ForumReplyDto[]) => ForumReplyDto[]) =>
    queryClient.setQueryData(forumQueries.replies(topicId).queryKey, old => update(old ?? []));
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ForumFilter | null>(null);
  const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<number | null>(null);
  const [pendingCloseTopicId, setPendingCloseTopicId] = useState<number | null>(null);
  const [pendingDeleteReply, setPendingDeleteReply] = useState<{ topicId: number; replyId: number } | null>(null);
  const [searchParams] = useSearchParams();
  const deepLinkTopicId = searchParams.get('topic');
  const didHandleDeepLink = useRef(false);

  // Mark the visit only once this page's own fresh topic list is in, so the unread markers it shows
  // reflect the state before the visit; then let the navbar badge catch up with the server.
  const didVisit = useRef(false);
  useEffect(() => {
    if (didVisit.current || !topicsQuery.isFetchedAfterMount) return;
    didVisit.current = true;
    forumApi
      .visitForum()
      .then(() => queryClient.invalidateQueries({ queryKey: forumKeys.unreadCount() }))
      .catch(err => reportClientError(err, 'action'));
  }, [topicsQuery.isFetchedAfterMount, queryClient]);

  // Open the topic from the ?topic=<id> deep link (from the dashboard widget) automatically, once,
  // as soon as the topics are loaded. The ref stops the topic from reopening right after closing.
  useEffect(() => {
    if (didHandleDeepLink.current || !deepLinkTopicId || topics.length === 0) return;
    const topicId = Number(deepLinkTopicId);
    if (!topics.some(m => m.id === topicId)) return;
    didHandleDeepLink.current = true;

    setExpandedId(topicId);
    document.getElementById(`topic-${topicId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [deepLinkTopicId, topics]);

  // Fetching a topic's replies marks it seen on the server -- mirror that in the list.
  useEffect(() => {
    if (expandedId === null || !expandedReplies) return;
    setTopics(prev => prev.map(m => (m.id === expandedId ? { ...m, lastSeenReplyCount: expandedReplies.length } : m)));
  }, [expandedId, expandedReplies, setTopics]);

  // Any change to the topic list may change the unread count in the navbar badge.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: forumKeys.unreadCount() });
  }, [topicsQuery.data, queryClient]);

  const displayTopics = useMemo(
    () => filterTopics(sortByLastActivity(topics), { query: searchQuery, filter: activeFilter, userId: user?.id }),
    [topics, searchQuery, activeFilter, user]
  );

  const toggleExpand = (topicId: number) => setExpandedId(current => (current === topicId ? null : topicId));

  const { mutate: deleteTopic } = useMutation({
    mutationFn: (topicId: number) => forumApi.deleteTopic(topicId),
    onSuccess: (_result, topicId) => {
      setTopics(prev => prev.filter(m => m.id !== topicId));
      setPendingDeleteTopicId(null);
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  const { mutate: closeTopic } = useMutation({
    mutationFn: (topicId: number) => forumApi.closeTopic(topicId),
    onSuccess: (closed, topicId) => {
      updateTopic(topicId, m => ({ ...m, closedAt: closed.closedAt }));
      setPendingCloseTopicId(null);
    },
  });

  const { mutate: deleteReply } = useMutation({
    mutationFn: ({ topicId, replyId }: { topicId: number; replyId: number }) => forumApi.deleteReply(topicId, replyId),
    onSuccess: (_result, { topicId, replyId }) => {
      setReplies(topicId, prev => prev.filter(r => r.id !== replyId));
      updateTopic(topicId, withReplyRemoved);
      setPendingDeleteReply(null);
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  const { mutate: createTopic } = useMutation({
    mutationFn: (data: ForumTopicInput) => forumApi.createTopic(data),
    onSuccess: topic => {
      setTopics(prev => [topic, ...prev]);
      setShowNewForm(false);
    },
    meta: { errorMessage: 'error_send_failed' },
  });

  const { mutate: createReply } = useMutation({
    mutationFn: ({ topicId, body }: { topicId: number; body: string }) => forumApi.createReply(topicId, body),
    onSuccess: (reply, { topicId }) => {
      setReplies(topicId, prev => [...prev, reply]);
      updateTopic(topicId, m => withReplyAdded(m, reply));
      setReplyDrafts(prev => ({ ...prev, [topicId]: '' }));
    },
    meta: { errorMessage: 'error_send_failed' },
  });

  const confirmDeleteTopic = () => {
    if (pendingDeleteTopicId === null) return;
    deleteTopic(pendingDeleteTopicId);
  };

  const confirmCloseTopic = () => {
    if (pendingCloseTopicId === null) return;
    closeTopic(pendingCloseTopicId);
  };

  const confirmDeleteReply = () => {
    if (pendingDeleteReply === null) return;
    deleteReply(pendingDeleteReply);
  };

  const submitReply = (topicId: number) => {
    const body = replyDrafts[topicId] || '';
    if (!body.trim()) return;
    createReply({ topicId, body });
  };

  const setReplyDraft = (topicId: number, body: string) => setReplyDrafts(prev => ({ ...prev, [topicId]: body }));

  return {
    user,
    projectOptions,
    displayTopics,
    expandedId,
    expandedReplies: expandedReplies ?? [],
    toggleExpand,
    showNewForm,
    setShowNewForm,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    replyDrafts,
    setReplyDraft,
    submitReply,
    createTopic,
    pendingDeleteTopicId,
    setPendingDeleteTopicId,
    confirmDeleteTopic,
    pendingCloseTopicId,
    setPendingCloseTopicId,
    confirmCloseTopic,
    pendingDeleteReply,
    setPendingDeleteReply,
    confirmDeleteReply,
  };
}
