import { useTranslation } from 'react-i18next';
import { FormProjectDto, MadocProjectVisibility, madocProjectVisibility } from '@dissco-cs/shared-types';

// How many projects use a form, per visibility: "4 published · 1 unpublished".
export function FormProjectCounts({ projects }: { projects: FormProjectDto[] }) {
  const { t } = useTranslation('dissco-cs');
  const count = (visibility: MadocProjectVisibility) => projects.filter(project => madocProjectVisibility(project.status) === visibility).length;
  const published = count('published');
  const unpublished = count('unpublished');
  const archived = count('archived');

  return (
    <>
      {[
        published > 0 && t('sm_form_layouts_published', { count: published }),
        unpublished > 0 && t('sm_form_layouts_unpublished', { count: unpublished }),
        archived > 0 && t('sm_form_layouts_archived', { count: archived }),
      ]
        .filter(Boolean)
        .join(' · ')}
    </>
  );
}
