import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SitePageLang } from '@dissco-cs/shared-types';
import { defaultLang } from '../utility/site-lang-text';
import { hasDraftChanged } from '../utility/draft-changes';
import { useDiscardGuard } from './use-discard-guard';

// Form state for a management page where one item of a list is created or edited at a time in a
// side form: which item is open (null = a new one), the draft in the form, the active language tab,
// and which item awaits delete confirmation. Saving, deleting and validating stay in the page.
// cancelForm, startCreate and startEdit first ask when the draft has unsaved changes (the page
// renders <DiscardDialog guard={discardGuard} />); closeForm is for after a save, it never asks.
export function useItemEditor<Item extends { id: unknown }, Draft>({
  emptyDraft,
  toDraft,
}: {
  emptyDraft: Draft;
  // Loads an existing item into the form.
  toDraft: (item: Item) => Draft;
}) {
  const { i18n } = useTranslation('dissco-cs');
  const [editingId, setEditingId] = useState<Item['id'] | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [initialDraft, setInitialDraft] = useState<Draft>(emptyDraft);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [pendingDeleteId, setPendingDeleteId] = useState<Item['id'] | null>(null);
  const discardGuard = useDiscardGuard(isFormOpen && hasDraftChanged(draft, initialDraft));

  const openForm = (id: Item['id'] | null, next: Draft) => {
    setEditingId(id);
    setDraft(next);
    setInitialDraft(next);
    setSelectedLang(defaultLang(i18n.language));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  return {
    editingId,
    isFormOpen,
    draft,
    setDraft,
    selectedLang,
    setSelectedLang,
    pendingDeleteId,
    setPendingDeleteId,
    startCreate: () => discardGuard.guard(() => openForm(null, emptyDraft)),
    startEdit: (item: Item) => discardGuard.guard(() => openForm(item.id, toDraft(item))),
    cancelForm: () => discardGuard.guard(closeForm),
    closeForm,
    discardGuard,
  };
}
