import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SitePageLang } from '@dissco-cs/shared-types';
import { defaultLang } from '../utility/site-lang-text';

// Form state for a management page where one item of a list is created or edited at a time in a
// side form: which item is open (null = a new one), the draft in the form, the active language tab,
// and which item awaits delete confirmation. Saving, deleting and validating stay in the page.
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
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [pendingDeleteId, setPendingDeleteId] = useState<Item['id'] | null>(null);

  const openForm = (id: Item['id'] | null, next: Draft) => {
    setEditingId(id);
    setDraft(next);
    setSelectedLang(defaultLang(i18n.language));
    setIsFormOpen(true);
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
    startCreate: () => openForm(null, emptyDraft),
    startEdit: (item: Item) => openForm(item.id, toDraft(item)),
    cancelForm: () => {
      setIsFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft);
    },
  };
}
