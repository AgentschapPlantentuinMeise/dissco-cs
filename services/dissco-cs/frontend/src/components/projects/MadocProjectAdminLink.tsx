import { useTranslation } from 'react-i18next';
import { LuExternalLink } from 'react-icons/lu';
import { FormProjectDto } from '@dissco-cs/shared-types';
import { getSiteSlug } from '../../api/slug';
import { urlPath } from '../../api/url';
import { localeText } from '../../utility/locale-text';

// The project's name as a link to its page in Madoc's admin (configuration, tasks, "Duplicate this
// project"), in a new tab so the admin keeps their place in site management.
export function MadocProjectAdminLink({ project, title }: {
  project: Pick<FormProjectDto, 'id' | 'slug' | 'label'>;
  title?: string;
}) {
  const { t, i18n } = useTranslation('dissco-cs');

  return (
    <a
      href={urlPath`/s/${getSiteSlug()}/admin/projects/${project.id}`}
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? t('sm_project_open_in_madoc')}
      className="inline-flex items-center gap-1 text-cs-primary hover:underline"
    >
      {localeText(project.label, i18n.language) || project.slug}
      <LuExternalLink aria-hidden="true" className="flex-shrink-0" />
    </a>
  );
}
