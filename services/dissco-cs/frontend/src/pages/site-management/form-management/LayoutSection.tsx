import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { LuArrowDown, LuArrowUp } from 'react-icons/lu';
import { FormLayoutSection, MAX_FORM_LAYOUT_SECTION_TITLE_LENGTH, SitePageLang } from '@dissco-cs/shared-types';
import { IconButton } from '../../../components/ui/IconButton';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { inputClass } from '../../../components/ui/input-styles';
import { moveItem, removeSection, setSectionTitle } from './form-layout-editor';
import { DropGap, LayoutEditing, LayoutRow } from './LayoutDropZones';

// A section of the layout: its title in the chosen language, buttons to move or remove it, and its
// rows. Removing a section keeps its fields in the layout as loose rows.
export function LayoutSection({ section, index, lang, editing }: {
  section: FormLayoutSection;
  index: number;
  lang: SitePageLang;
  editing: LayoutEditing;
}) {
  const { t } = useTranslation('dissco-cs');
  const { items, onChange } = editing;

  return (
    <div className="border border-gray-200 rounded bg-gray-50">
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-cs-primary/[0.06]">
        <input
          type="text"
          value={section.title[lang] ?? ''}
          onChange={e => onChange(setSectionTitle(items, index, lang, e.target.value))}
          placeholder={t('sm_form_layouts_section_title')}
          aria-label={t('sm_form_layouts_section_title')}
          aria-invalid={!(section.title[lang] ?? '').trim()}
          maxLength={MAX_FORM_LAYOUT_SECTION_TITLE_LENGTH}
          className={`${inputClass} flex-1 min-w-0 font-semibold text-cs-primary`}
        />
        <IconButton icon={LuArrowUp} label={t('sm_pages_move_up')} onClick={() => onChange(moveItem(items, index, -1))} disabled={index === 0} />
        <IconButton
          icon={LuArrowDown}
          label={t('sm_pages_move_down')}
          onClick={() => onChange(moveItem(items, index, 1))}
          disabled={index === items.length - 1}
        />
        <DeleteIconButton onClick={() => onChange(removeSection(items, index))} />
      </div>
      <div className="flex flex-col gap-1 p-2">
        {section.rows.map((row, rowIndex) => (
          <Fragment key={rowIndex}>
            <DropGap place={{ section: index, index: rowIndex }} />
            <LayoutRow row={row} place={{ section: index, index: rowIndex }} editing={editing} />
          </Fragment>
        ))}
        <DropGap
          place={{ section: index, index: section.rows.length }}
          label={section.rows.length === 0 ? t('sm_form_layouts_drop_here') : undefined}
        />
      </div>
    </div>
  );
}
