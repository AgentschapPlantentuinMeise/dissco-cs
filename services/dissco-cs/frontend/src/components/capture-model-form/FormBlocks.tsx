import React from 'react';
import { useTranslation } from 'react-i18next';
import { firstFilledLang } from '@dissco-cs/shared-types';
import { siteLangText } from '../../utility/site-lang-text';
import { FormBlock } from './capture-model-rules';
import { Fieldset } from './Fieldset';
import { FieldContext, FieldRows } from './ModelFields';

// The form as a form layout arranges it (see applyFormLayout): loose rows, and sections that start
// open, titled in the visitor's language.
export function FormBlocks({ blocks, ...context }: FieldContext & { blocks: FormBlock[] }) {
  const { i18n } = useTranslation('dissco-cs');

  return (
    <>
      {blocks.map((block, idx) =>
        block.kind === 'section' ? (
          <Fieldset key={idx} label={siteLangText(block.title, i18n.language, firstFilledLang(block.title) ?? '')} required={false}>
            <FieldRows rows={block.rows} {...context} />
          </Fieldset>
        ) : (
          <FieldRows key={idx} rows={[block]} {...context} />
        )
      )}
    </>
  );
}
