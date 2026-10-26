import { useTranslation } from 'react-i18next';
import { IconType } from 'react-icons';
import { LuChevronRight, LuExternalLink } from 'react-icons/lu';
import { HrefLink } from '../../utility/href-link';
import { rowHoverClass } from '../../components/ui/list-styles';

export interface ManageLink {
  href: string;
  titleKey: string;
  descKey: string;
  icon: IconType;
  // A page of Madoc itself: a full page load instead of a route inside this app.
  external?: boolean;
}

export interface ManageGroup {
  // Without a title the group is just a list.
  titleKey?: string;
  links: ManageLink[];
}

const ROW_CLASS = `flex items-center gap-3 px-4 py-3 no-underline text-inherit ${rowHoverClass}`;

// The parts of site management as rows in groups, each one leading to its page.
export function ManageList({ groups }: { groups: ManageGroup[] }) {
  const { t } = useTranslation('dissco-cs');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
      {groups.map(group => (
        <section key={group.titleKey ?? group.links[0].href} className="min-w-0">
          {group.titleKey && (
            <h2 className="m-0 mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-gray-500">{t(group.titleKey)}</h2>
          )}
          <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
            {group.links.map(link => {
              const Icon = link.icon;
              const content = (
                <>
                  <Icon aria-hidden="true" className="flex-shrink-0 text-lg text-cs-primary" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-gray-900">{t(link.titleKey)}</span>
                    <span className="block text-sm text-gray-500">{t(link.descKey)}</span>
                  </span>
                  {link.external ? (
                    <LuExternalLink aria-hidden="true" className="flex-shrink-0 text-gray-400" />
                  ) : (
                    <LuChevronRight aria-hidden="true" className="flex-shrink-0 text-gray-400" />
                  )}
                </>
              );
              return (
                <li key={link.href}>
                  {link.external ? (
                    <a href={link.href} className={ROW_CLASS}>{content}</a>
                  ) : (
                    <HrefLink href={link.href} className={ROW_CLASS}>{content}</HrefLink>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
