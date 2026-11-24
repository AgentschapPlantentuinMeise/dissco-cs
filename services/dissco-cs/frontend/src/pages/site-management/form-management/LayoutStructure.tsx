import { Fragment, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SitePageLang } from '@dissco-cs/shared-types';
import { Button } from '../../../components/ui/Button';
import { EmptyText } from '../../../components/layout/EmptyText';
import { addSection, dropId, dropTerm, parseDropId, placedTerms } from './form-layout-editor';
import { DropGap, LayoutEditing, LayoutRow } from './LayoutDropZones';
import { LayoutSection } from './LayoutSection';
import { LayoutFieldChip } from './LayoutFieldChip';

// With the mouse, the spot under the pointer counts, so the thin gaps between rows can be hit. The
// keyboard has no pointer: it takes the drop target nearest to the dragged field.
const collisionDetection: CollisionDetection = args => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCenter(args);
};

// The left half of the layout editor: loose rows and sections, in order, and the fields that are
// not placed yet. A field is dragged onto a row (to sit beside it), between rows (a row of its
// own), or back to the unplaced fields.
export function LayoutStructure({ lang, editing }: { lang: SitePageLang; editing: LayoutEditing }) {
  const { t } = useTranslation('dissco-cs');
  const { items, fields, projectCount, onChange } = editing;
  // A small distance before a drag starts, so a click on a field does not move it.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const target = over ? parseDropId(String(over.id)) : null;
    if (target) onChange(dropTerm(items, String(active.id), target, fields));
  };

  const placed = placedTerms(items);
  const unplaced = fields.filter(field => !placed.has(field.term));

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-1">
        {items.map((item, index) => (
          <Fragment key={index}>
            <DropGap place={{ section: null, index }} />
            {item.kind === 'row' ? (
              <LayoutRow row={item} place={{ section: null, index }} editing={editing} />
            ) : (
              <LayoutSection section={item} index={index} lang={lang} editing={editing} />
            )}
          </Fragment>
        ))}
        <DropGap place={{ section: null, index: items.length }} label={items.length === 0 ? t('sm_form_layouts_drop_here') : undefined} />
      </div>

      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={() => onChange(addSection(items))}>
          {t('sm_form_layouts_add_section')}
        </Button>
      </div>

      <UnplacedFields>
        {unplaced.length === 0 ? (
          <EmptyText compact>{t('sm_form_layouts_all_placed')}</EmptyText>
        ) : (
          unplaced.map(field => <LayoutFieldChip key={field.term} term={field.term} field={field} projectCount={projectCount} />)
        )}
      </UnplacedFields>
    </DndContext>
  );
}

// Fields dropped here leave the layout; on the form they come after the placed fields.
function UnplacedFields({ children }: { children: ReactNode }) {
  const { t } = useTranslation('dissco-cs');
  const { setNodeRef, isOver } = useDroppable({ id: dropId({ kind: 'unplaced' }) });

  return (
    <div
      ref={setNodeRef}
      className={`mt-5 p-3 rounded border border-dashed transition-colors ${isOver ? 'border-cs-secondary bg-cs-secondary/10' : 'border-attention-200 bg-attention-50'}`}
    >
      <h3 className="text-sm font-semibold text-attention-800 m-0">{t('sm_form_layouts_unplaced')}</h3>
      <p className="text-xs text-gray-600 mt-0.5 mb-2">{t('sm_form_layouts_unplaced_hint')}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
