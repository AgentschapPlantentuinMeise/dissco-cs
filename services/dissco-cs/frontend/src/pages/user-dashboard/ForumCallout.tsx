import { useTranslation } from 'react-i18next';
import { LuArrowRight } from 'react-icons/lu';
import { HrefLink } from '../../utility/href-link';
import { withQuery } from '../../api/url';

// One line asking the user to help on the forum, linking to its unanswered questions. Not a list:
// the questions are the whole site's, not the user's own.
export function ForumCallout({ count }: { count: number }) {
  const { t } = useTranslation('dissco-cs');
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-cs-primary/[0.07] border-l-[3px] border-cs-primary rounded-r px-[18px] py-3.5 text-[0.93rem] text-gray-700">
      <span>{t('dashboard_forum_callout', { count })}</span>
      <HrefLink
        href={withQuery('/forum', { filter: 'unanswered' })}
        className="inline-flex items-center gap-1.5 font-semibold text-cs-primary no-underline hover:underline"
      >
        {t('dashboard_forum_callout_link')} <LuArrowRight aria-hidden="true" />
      </HrefLink>
    </div>
  );
}
