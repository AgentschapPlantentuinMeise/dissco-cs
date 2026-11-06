import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { forumQueries } from '../../api/queries/forum';
import { withQuery } from '../../api/url';
import { filterTopics, sortByLastActivity } from '../../components/forum/forum-topics';
import { PageSection, PageSectionTone } from '../../components/layout/PageSection';
import { CardStat } from '../../components/ui/CardStat';
import { rowHoverClass } from '../../components/ui/list-styles';
import { formatTimeAgo } from '../../utility/format-date';
import { HrefLink } from '../../utility/href-link';

const SHOWN = 5;

const badgeClass = 'text-[0.68rem] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5';

// The latest forum questions about this project, at the bottom of its page; each opens in the forum.
// Only for logged-in users, like the forum itself. Without questions the section is left out.
export function ProjectForumTopics({ projectSlug, tone }: { projectSlug: string; tone: PageSectionTone }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: topics } = useQuery(forumQueries.topics());
  const projectTopics = useMemo(
    () => filterTopics(sortByLastActivity(topics ?? []), { query: '', filter: null, userId: undefined, projectSlug }),
    [topics, projectSlug]
  );

  if (projectTopics.length === 0) {
    return null;
  }

  return (
    <PageSection tone={tone} title={t('pdp_forum_title')}>
      <div className="border-t border-gray-100">
        {projectTopics.slice(0, SHOWN).map(topic => (
          <HrefLink
            key={topic.id}
            href={withQuery('/forum', { topic: topic.id })}
            className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 no-underline border-b border-[#f0f0f0] last:border-b-0 ${rowHoverClass}`}
          >
            <span className="min-w-0 flex flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.92rem] font-medium text-cs-primary">
                {topic.title}
                {topic.closedAt && <span className={badgeClass}>{t('forum_closed_badge')}</span>}
              </span>
              <span className="text-[0.78rem] text-gray-500">
                {topic.authorName} · {formatTimeAgo(topic.lastActivity, i18n.language)}
              </span>
            </span>
            <span className="text-[0.86rem] text-gray-600 whitespace-nowrap">
              {topic.replyCount > 0 ? (
                <CardStat value={topic.replyCount} label={t('forum_reply_count', { count: topic.replyCount })} />
              ) : (
                <span className={badgeClass}>{t('forum_filter_unanswered')}</span>
              )}
            </span>
          </HrefLink>
        ))}
      </div>
      {projectTopics.length > SHOWN && (
        <HrefLink href={withQuery('/forum', { project: projectSlug })} className="inline-block mt-3 text-[0.9rem] font-semibold text-cs-primary no-underline hover:underline">
          {t('pdp_forum_all')}
        </HrefLink>
      )}
    </PageSection>
  );
}
