import { useTranslation } from 'react-i18next';
import { FormLayoutFieldsDto, FormLayoutItem, SitePageLang } from '@dissco-cs/shared-types';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { LoadingText } from '../../../components/layout/LoadingText';
import { SectionLoadError } from '../../../components/layout/SectionLoadError';
import { loadState } from '../../../api/query-state';
import { missingTitleLangs } from './form-layout-editor';
import { LayoutStructure } from './LayoutStructure';
import { FormLayoutPreview } from './FormLayoutPreview';

// A form's layout: its structure beside a preview of the form, with a tab per site language for the
// section titles. Whether it may be saved is decided by the form editor around it.
export function FormLayoutEditor({ items, onChange, selectedLang, onSelectLang, fieldsQuery }: {
  items: FormLayoutItem[];
  onChange: (items: FormLayoutItem[]) => void;
  selectedLang: SitePageLang;
  onSelectLang: (lang: SitePageLang) => void;
  fieldsQuery: { data: FormLayoutFieldsDto | undefined; errorUpdateCount: number };
}) {
  const { t } = useTranslation('dissco-cs');

  const state = loadState(fieldsQuery);
  if (state === 'failed') return <SectionLoadError />;
  if (state === 'loading' || !fieldsQuery.data) return <LoadingText compact />;

  const { fields, projectCount } = fieldsQuery.data;
  const missingLangs = missingTitleLangs(items);

  return (
    <>
      <LanguageTabs selected={selectedLang} onSelect={onSelectLang} isMissing={lang => missingLangs.includes(lang)} />
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <section className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-700 mt-0 mb-2">{t('sm_form_layouts_structure')}</h3>
          <LayoutStructure lang={selectedLang} editing={{ items, fields, projectCount, onChange }} />
        </section>
        <section className="min-w-0 lg:sticky lg:top-[calc(var(--cs-navbar-height)+1rem)]">
          <h3 className="text-sm font-semibold text-gray-700 mt-0 mb-2">{t('sm_form_layouts_preview')}</h3>
          <FormLayoutPreview items={items} fields={fields} />
        </section>
      </div>
    </>
  );
}
