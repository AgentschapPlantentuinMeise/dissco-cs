import { useDroppable } from '@dnd-kit/core';
import { FormLayoutFieldDto, FormLayoutItem, FormLayoutRow } from '@dissco-cs/shared-types';
import { RowPlace, canJoinRow, dropId } from './form-layout-editor';
import { LayoutFieldChip } from './LayoutFieldChip';

export interface LayoutEditing {
  items: FormLayoutItem[];
  fields: FormLayoutFieldDto[];
  projectCount: number;
  onChange: (items: FormLayoutItem[]) => void;
}

// The space before a row: dropping a field here gives it a new row of its own. It only takes room
// while a field is being dragged, unless it carries a label (the place to start an empty section).
export function DropGap({ place, label }: { place: RowPlace; label?: string }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: dropId({ kind: 'gap', place }) });
  if (!active && !label) {
    return <div ref={setNodeRef} className="h-1" />;
  }
  return (
    <div
      ref={setNodeRef}
      className={`rounded border border-dashed text-xs text-center transition-colors ${
        isOver ? 'border-cs-secondary bg-cs-secondary/10 text-cs-primary py-2.5' : 'border-gray-300 text-gray-400 py-1.5'
      }`}
    >
      {label}
    </div>
  );
}

// A row of the layout: dropping a field on it puts the field beside the others, when it may join
// (see canJoinRow); the row only lights up then.
export function LayoutRow({ row, place, editing }: { row: FormLayoutRow; place: RowPlace; editing: LayoutEditing }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: dropId({ kind: 'row', place }) });
  const accepts = !!active && canJoinRow(editing.items, String(active.id), place, editing.fields);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-wrap gap-2 p-1 rounded border transition-colors ${isOver && accepts ? 'border-cs-secondary bg-cs-secondary/10' : 'border-transparent'}`}
    >
      {row.terms.map(term => (
        <LayoutFieldChip key={term} term={term} field={editing.fields.find(field => field.term === term)} projectCount={editing.projectCount} />
      ))}
    </div>
  );
}
