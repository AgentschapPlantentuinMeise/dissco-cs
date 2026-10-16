import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft, LuCheck } from 'react-icons/lu';
import { MadocCaptureModelDto, MadocStructureNodeDto, MadocAnnotationDocumentDto } from '@dissco-cs/shared-types';
import { DocumentPath } from '../../../utility/annotation-document';
import { collectMissingRequiredLabels, hasVisibleRequiredField, resolveSectionModels, resolveSingleChoice } from './capture-model-rules';
import { Fieldset } from './Fieldset';
import { ModelFields } from './ModelFields';
import { SelectorControls } from './SelectorControl';

export interface CaptureModelFormProps {
  model: MadocCaptureModelDto;
  document: MadocAnnotationDocumentDto;
  onChange: (path: DocumentPath, value: unknown) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  saving?: boolean;
  /** Brief success message shown next to the save/submit buttons after a successful save. */
  confirmation?: string | null;
  /** Fires whenever the resolved 'model' node changes (immediately if structure has no choice step) — the caller needs this node's `fields`/`id` to submit a revision. */
  onActiveStructureChange?: (node: MadocStructureNodeDto & { type: 'model' }) => void;
  /** Path of the field currently being drawn on the image, if any — drives the "draw"/"cancel" control on that field's row. */
  drawingPath?: DocumentPath | null;
  /** User clicked the draw button of a field that has a selector. */
  onRequestDraw?: (path: DocumentPath) => void;
  /** User cancelled the in-progress draw. */
  onCancelDraw?: () => void;
  /** User cleared a previously drawn region. */
  onClearSelector?: (path: DocumentPath) => void;
  /** Shows the form read-only, with a banner. */
  readOnly?: boolean;
  /** Text of the banner at the top of the form when readOnly is true. */
  readOnlyBanner?: string;
}

export function CaptureModelForm({
  model,
  document,
  onChange,
  onSaveDraft,
  onSubmit,
  saving,
  confirmation,
  onActiveStructureChange,
  drawingPath,
  onRequestDraw,
  onCancelDraw,
  onClearSelector,
  readOnly,
  readOnlyBanner,
}: CaptureModelFormProps) {
  const { t } = useTranslation('dissco-cs');
  const selectorControls: SelectorControls = { drawingPath, onRequestDraw, onCancelDraw, onClearSelector };
  // A choice node just picks between alternative 'model' nodes — this stack lets the user
  // step back through nested choices instead of re-rendering a separate "choice screen".
  const [stack, setStack] = useState<MadocStructureNodeDto[]>([resolveSingleChoice(model.structure)]);

  useEffect(() => {
    setStack([resolveSingleChoice(model.structure)]);
  }, [model]);

  const current = stack[stack.length - 1];
  const [missingRequired, setMissingRequired] = useState<string[]>([]);

  // Non-null when `current` is a choice opted into 'tabs' — its models are shown together as
  // sections instead of a pick-one-then-navigate screen. See resolveSectionModels above.
  // Memoized so the array stays referentially stable across renders (it only depends on
  // `current`) — otherwise combinedSectionsModel/activeModel below would recompute every render,
  // re-firing the onActiveStructureChange effect and looping the component into a render storm.
  const sectionModels = useMemo(() => resolveSectionModels(current), [current]);

  // Sections mode has no single 'model' node to report/submit against, so its models' fields are
  // combined into one synthetic model — memoized so the object stays stable across renders (it
  // only depends on `current`), matching how `current` itself is already stable per stack entry.
  const combinedSectionsModel = useMemo<(MadocStructureNodeDto & { type: 'model' }) | null>(() => {
    if (!sectionModels) return null;
    return { id: current.id, label: current.label, type: 'model', fields: sectionModels.flatMap(m => m.fields) };
  }, [sectionModels, current]);

  const activeModel = current.type === 'model' ? current : combinedSectionsModel;

  useEffect(() => {
    if (activeModel) onActiveStructureChange?.(activeModel);
  }, [activeModel, onActiveStructureChange]);

  const handleSubmit = () => {
    if (!activeModel) return;
    const missing = collectMissingRequiredLabels(activeModel.fields, document);
    setMissingRequired(missing);
    if (missing.length > 0) return;
    onSubmit();
  };

  if (current.type === 'choice' && !sectionModels) {
    return (
      <div className="flex flex-col h-full">
        {readOnly && readOnlyBanner && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-[0.88rem] font-medium flex-shrink-0">
            {readOnlyBanner}
          </div>
        )}
        <div className={`p-5 ${readOnly ? 'pointer-events-none opacity-60 select-none' : ''}`}>
          {stack.length > 1 && (
            <button className="text-[0.85rem] text-[var(--cs-primary)] mb-3 inline-flex items-center gap-1" onClick={() => setStack(s => s.slice(0, -1))}>
              <LuArrowLeft aria-hidden="true" /> {t('annotate_choice_back')}
            </button>
          )}
          <p className="text-[0.95rem] font-medium text-gray-800 mb-3">{current.label}</p>
          <div className="flex flex-col gap-2">
            {current.items.map(item => (
              <button
                key={item.id}
                className="px-4 py-2 bg-white border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded text-[0.9rem] text-left hover:bg-[var(--cs-primary)] hover:text-white"
                onClick={() => setStack(s => [...s, resolveSingleChoice(item)])}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {readOnly && readOnlyBanner && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-[0.88rem] font-medium flex-shrink-0">
          {readOnlyBanner}
        </div>
      )}
      {stack.length > 1 && (
        <div className="px-5 pt-3">
          <button className="text-[0.85rem] text-[var(--cs-primary)] inline-flex items-center gap-1" onClick={() => setStack(s => s.slice(0, -1))}>
            <LuArrowLeft aria-hidden="true" /> {t('annotate_other_choice')}
          </button>
        </div>
      )}
      <div className={`flex-1 min-h-0 px-5 py-5 pb-2 overflow-y-auto ${readOnly ? 'pointer-events-none opacity-60 select-none' : ''}`}>
        {activeModel && hasVisibleRequiredField(activeModel.fields, document) && (
          <p className="text-[0.78rem] text-gray-500 mb-3">
            <span className="text-red-500">*</span> {t('annotate_required_legend')}
          </p>
        )}
        {sectionModels
          ? sectionModels.map(sectionModel => (
              <Fieldset key={sectionModel.id} label={sectionModel.label} required={false}>
                <ModelFields fields={sectionModel.fields} document={document} pathPrefix={[]} onChange={onChange} selectorControls={selectorControls} />
              </Fieldset>
            ))
          : current.type === 'model' && (
              <ModelFields fields={current.fields} document={document} pathPrefix={[]} onChange={onChange} selectorControls={selectorControls} />
            )}
      </div>
      {!readOnly && (
        <div className="px-5 py-3 border-t border-gray-300 bg-gray-50">
          {missingRequired.length > 0 && (
            <p className="text-[0.8rem] text-red-600 mb-2">
              {t('annotate_missing_required', { labels: missingRequired.join(', ') })}
            </p>
          )}
          <div className="flex gap-2 items-center flex-wrap">
            <button
              className="flex-shrink-0 px-4 py-2 bg-white border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded text-[0.9rem] disabled:opacity-50"
              onClick={onSaveDraft}
              disabled={saving}
            >
              {t('task_save_draft')}
            </button>
            <button
              className="flex-shrink-0 px-4 py-2 bg-[var(--cs-primary)] text-white rounded text-[0.9rem] disabled:opacity-50"
              onClick={handleSubmit}
              disabled={saving}
            >
              {t('task_submit')}
            </button>
            {confirmation && (
              <span className="text-[0.9rem] text-[var(--cs-primary)] font-medium inline-flex items-center gap-1">
                <LuCheck aria-hidden="true" /> {confirmation}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
