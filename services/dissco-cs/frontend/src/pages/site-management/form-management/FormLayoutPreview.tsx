import { useMemo } from 'react';
import { FormLayoutFieldDto, FormLayoutItem } from '@dissco-cs/shared-types';
import { FormBlocks } from '../../../components/capture-model-form/FormBlocks';
import { applyFormLayout } from '../../../components/capture-model-form/capture-model-rules';
import { previewModel } from './form-layout-editor';

const ignoreChange = () => undefined;

// The form as a volunteer will see it with this layout, drawn by the same components as the
// annotation page, with empty fields. It only shows: typing in it changes nothing.
export function FormLayoutPreview({ items, fields }: { items: FormLayoutItem[]; fields: FormLayoutFieldDto[] }) {
  const preview = useMemo(() => previewModel(fields), [fields]);
  const blocks = useMemo(() => applyFormLayout(items, preview.fields), [items, preview]);

  return (
    <div className="pointer-events-none select-none bg-white border border-gray-200 rounded p-4">
      <FormBlocks blocks={blocks} document={preview.document} pathPrefix={[]} onChange={ignoreChange} selectorControls={{}} />
    </div>
  );
}
