import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDto, FormLayoutItem, SitePageLang, formSaveSchema } from '@dissco-cs/shared-types';
import { formKeys, formQueries } from '../../../api/queries/forms';
import { projectKeys } from '../../../api/queries/projects';
import { institutionKeys } from '../../../api/queries/institutions';
import { manualKeys } from '../../../api/queries/manuals';
import { formsApi } from '../../../api/cs-client/forms';
import { useDiscardGuard } from '../../../hooks/use-discard-guard';
import { useSavedFlash } from '../../../hooks/use-saved-flash';
import { hasDraftChanged } from '../../../utility/draft-changes';
import { defaultLang } from '../../../utility/site-lang-text';

// A null layout means the form shows Madoc's own field order.
export type FormDraft = {
  templateProjectId: number | null;
  institutionId: number | null;
  manualId: number | null;
  layout: FormLayoutItem[] | null;
};

const EMPTY_DRAFT: FormDraft = { templateProjectId: null, institutionId: null, manualId: null, layout: null };

const toDraft = (form: FormDto): FormDraft => ({
  templateProjectId: form.templateProjectId,
  institutionId: form.institutionId,
  manualId: form.manualId,
  layout: form.layout,
});

// The forms, and the one form opened for editing: its template project, institution, manual and layout are edited
// together and saved in one request.
export function useFormEditor() {
  const { i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const formsQuery = useQuery(formQueries.list());
  const [editing, setEditing] = useState<FormDto | null>(null);
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const fieldsQuery = useQuery({ ...formQueries.fields(editing?.formName ?? ''), enabled: editing !== null });
  const discardGuard = useDiscardGuard(editing !== null && hasDraftChanged(draft, toDraft(editing)));
  const { savedId: savedFormName, flash } = useSavedFlash<string>();

  const open = (form: FormDto) =>
    discardGuard.guard(() => {
      setEditing(form);
      setDraft(toDraft(form));
    });
  const close = () => discardGuard.guard(() => setEditing(null));

  const save = useMutation({
    mutationFn: (form: FormDto) => formsApi.update(formSaveSchema.parse({ formName: form.formName, ...draft })),
    onSuccess: async (_result, form) => {
      // This list, plus what reads a form through a project: the annotation page's layout, every
      // project page's institution and manual, the institution pages and the manual library's
      // "used by". The editor closes only once they are refreshed, otherwise the row shows the old
      // values for a moment.
      await Promise.all(
        [formKeys.all, projectKeys.all, institutionKeys.all, manualKeys.all].map(queryKey => queryClient.invalidateQueries({ queryKey }))
      );
      setEditing(null);
      flash(form.formName);
    },
  });

  return { formsQuery, fieldsQuery, editing, draft, setDraft, selectedLang, setSelectedLang, discardGuard, open, close, save, savedFormName };
}

export type FormEditorState = ReturnType<typeof useFormEditor>;
