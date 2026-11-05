import { useTranslation } from 'react-i18next';
import { LuBookOpen } from 'react-icons/lu';
import { InstitutionDto } from '@dissco-cs/shared-types';
import { Button } from '../../components/ui/Button';
import { HrefLink } from '../../utility/href-link';
import { siteLangText } from '../../utility/site-lang-text';
import { urlPath } from '../../api/url';
import { institutionsApi } from '../../api/cs-client/institutions';

// The column beside "About this project": the institution behind it, and the manual. The manual
// button lives only here, next to the text about the project, so the header keeps one action.
export function ProjectAboutAside({ institution, onOpenManual }: { institution?: InstitutionDto; onOpenManual?: () => void }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const name = institution ? siteLangText(institution.name, i18n.language, institution.slug) : '';
  const logoUrl = institution ? institutionsApi.logoUrl(institution) : null;

  return (
    <>
      {institution && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-gray-500">{t('pdp_project_of')}</span>
          <HrefLink
            href={urlPath`/institutions/${institution.slug}`}
            className="inline-flex items-center gap-3 font-semibold text-cs-primary no-underline hover:underline"
          >
            {logoUrl && <img src={logoUrl} alt="" className="h-9 w-auto max-w-[110px] object-contain" />}
            {name}
          </HrefLink>
        </div>
      )}
      {onOpenManual && (
        <Button variant="secondary" size="sm" onClick={onOpenManual} className="self-start">
          <LuBookOpen aria-hidden="true" /> {t('pdp_btn_guide')}
        </Button>
      )}
    </>
  );
}
