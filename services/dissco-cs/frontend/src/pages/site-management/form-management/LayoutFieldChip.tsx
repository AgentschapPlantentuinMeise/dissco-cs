import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { LuGripVertical } from 'react-icons/lu';
import { FormLayoutFieldDto } from '@dissco-cs/shared-types';

// A field of the layout editor that can be dragged, with mouse or keyboard (space to pick up,
// arrows to move, space to drop). It says when the field is not in every project of the form, or
// not in the form at all (the layout may be a copy made for another form).
export function LayoutFieldChip({ term, field, projectCount }: {
  term: string;
  field: FormLayoutFieldDto | undefined;
  projectCount: number;
}) {
  const { t } = useTranslation('dissco-cs');
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: term });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex flex-1 min-w-0 items-center gap-2 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm cursor-grab focus-visible:outline focus-visible:outline-2 focus-visible:outline-cs-accent ${
        isDragging ? 'relative z-10 shadow-md cursor-grabbing' : ''
      }`}
    >
      <LuGripVertical aria-hidden="true" className="flex-shrink-0 text-gray-400" />
      <span className="flex flex-col min-w-0">
        <span className="font-medium text-gray-800 truncate">
          {field?.label ?? term}
          {field?.required && <span className="text-danger-500"> *</span>}
        </span>
        <span className="font-mono text-xs text-gray-500 truncate">{term}</span>
      </span>
      {!field && <span className="ml-auto flex-shrink-0 text-xs font-semibold text-attention-700">{t('sm_form_layouts_not_in_form')}</span>}
      {field && field.inProjects < projectCount && (
        <span className="ml-auto flex-shrink-0 text-xs font-semibold text-attention-700">
          {t('sm_form_layouts_in_projects', { count: field.inProjects, total: projectCount })}
        </span>
      )}
    </div>
  );
}
