import { useState, useEffect, useMemo, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { projectQueries } from '../../api/queries/projects';
import { forumKeys, forumQueries } from '../../api/queries/forum';
import { forumApi } from '../../api/cs-client/forum';
import { reportClientError } from '../../api/cs-client/client-errors';
import { useCurrentUser } from '../../hooks/use-current-user';
import { useDiscardGuard } from '../../hooks/use-discard-guard';
import { localeText } from '../../utility/locale-text';
import { pageCount, pageOfItem, pageSlice } from '../../utility/paging';
import { MadocProjectDto, ForumTopicDto, ForumReplyDto, ForumTopicInput } from '@dissco-cs/shared-types';
import { FORUM_FILTERS, ForumFilter, countByFilter, filterTopics, sortByLastActivity, withReplyAdded, withReplyRemoved } from '../../components/forum/forum-topics';

// A list to read, not a card grid: a fixed number of topics per page.
const TOPICS_PER_PAGE = 15;

// Everything the forum page does: topics and replies from the cache, search and filters, paging, the
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
  const [newFormDirty, setNewFormDirty] = useState(false);
  const newFormGuard = useDiscardGuard(newFormDirty);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: expandedReplies } = useQuery(forumQueries.replies(expandedId));
  const setReplies = (topicId: number, update: (prev: ForumReplyDto[]) => ForumReplyDto[]) =>
    queryClient.setQueryData(forumQueries.replies(topicId).queryKey, old => update(old ?? []));
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  // A link can open the forum on a filter, e.g. the dashboard's call to the unanswered questions.
  const [activeFilter, setActiveFilterState] = useState<ForumFilter | null>(() => {
    const filter = searchParams.get('filter') as ForumFilter | null;
    return filter && FORUM_FILTERS.includes(filter) ? filter : null;
  });
  // A project page links to its questions with ?project=<slug>.
  const projectFilter = searchParams.get('project');
  const clearProjectFilter = () => {
    setSearchParams(
      params => {
        params.delete('project');
        return params;
      },
      { replace: true }
    );
    setCurrentPage(1);
  };
  const projectFilterLabel = projectFilter
    ? projectOptions.find(p => p.slug === projectFilter)?.label || topics.find(m => m.projectSlug === projectFilter)?.projectLabel || projectFilter
    : null;
  const [currentPage, setCurrentPage] = useState(1);
  // A new search or filter starts at page 1: the page you were on may no longer exist.
  const setSearchQuery = (query: string) => {
    setSearchQueryState(query);
    setCurrentPage(1);
  };
  const setActiveFilter: Dispatch<SetStateAction<ForumFilter | null>> = filter => {
    setActiveFilterState(filter);
    setCurrentPage(1);
  };
  const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<number | null>(null);
  const [pendingCloseTopicId, setPendingCloseTopicId] = useState<number | null>(null);
  const [pendingDeleteReply, setPendingDeleteReply] = useState<{ topicId: number; replyId: number } | null>(null);
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

    // On the page it is on in the unfiltered list -- a deep link comes without search or filter.
    setCurrentPage(pageOfItem(sortByLastActivity(topics), m => m.id === topicId, TOPICS_PER_PAGE) ?? 1);
    setExpandedId(topicId);
    // After that page has rendered, so the topic's row exists.
    requestAnimationFrame(() =>
      document.getElementById(`topic-${topicId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
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

  const filterCounts = useMemo(
    () => countByFilter(topics, { query: searchQuery, userId: user?.id, projectSlug: projectFilter }),
    [topics, searchQuery, user?.id, projectFilter]
  );
  const displayTopics = useMemo(
    () => filterTopics(sortByLastActivity(topics), { query: searchQuery, filter: activeFilter, userId: user?.id, projectSlug: projectFilter }),
    [topics, searchQuery, activeFilter, user, projectFilter]
  );
  const totalPages = pageCount(displayTopics.length, TOPICS_PER_PAGE);
  // Capped, not reset: deleting the last topic of the last page moves you one page back.
  const page = Math.min(currentPage, totalPages);
  const pageTopics = pageSlice(displayTopics, page, TOPICS_PER_PAGE);

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
    topicsLoading: topicsQuery.isPending,
    topicsError: topicsQuery.isError,
    projectOptions,
    displayTopics,
    pageTopics,
    currentPage: page,
    totalPages,
    setCurrentPage,
    filterCounts,
    expandedId,
    expandedReplies: expandedReplies ?? [],
    toggleExpand,
    showNewForm,
    openNewForm: () => setShowNewForm(true),
    closeNewForm: () => newFormGuard.guard(() => setShowNewForm(false)),
    setNewFormDirty,
    newFormGuard,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    projectFilterLabel,
    clearProjectFilter,
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
