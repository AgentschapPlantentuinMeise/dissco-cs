import { useTranslation } from 'react-i18next';
import { FormDto, FormLayoutItem } from '@dissco-cs/shared-types';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { inputClass } from '../../../components/ui/input-styles';
import { EmptyText } from '../../../components/layout/EmptyText';

// A form without a layout of its own shows Madoc's field order. A layout starts empty or as a copy
// of another form's; the copy keeps the terms the other form has, which the editor marks as not in
// this form.
export function NoFormLayout({ copyOptions, onCreate, onCopy }: {
  copyOptions: FormDto[];
  onCreate: () => void;
  onCopy: (layout: FormLayoutItem[]) => void;
}) {
  const { t } = useTranslation('dissco-cs');

  const copy = (formName: string) => {
    const layout = copyOptions.find(form => form.formName === formName)?.layout;
    if (layout) onCopy(layout);
  };

  return (
    <div className="border border-dashed border-gray-300 rounded bg-white px-6 pb-8 flex flex-col items-center gap-4">
      <EmptyText>{t('sm_forms_layout_empty')}</EmptyText>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Button variant="secondary" size="sm" onClick={onCreate}>
          {t('sm_form_layouts_create')}
        </Button>
        {copyOptions.length > 0 && (
          <>
            <span className="text-sm text-gray-500">{t('sm_forms_or')}</span>
            <Select value="" onChange={e => copy(e.target.value)} aria-label={t('sm_forms_copy_from')} className={inputClass}>
              <option value="">{t('sm_forms_copy_from')}</option>
              {copyOptions.map(form => (
                <option key={form.formName} value={form.formName}>
                  {form.formName}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>
    </div>
  );
}
