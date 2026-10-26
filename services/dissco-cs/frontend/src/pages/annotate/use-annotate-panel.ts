import { useCallback, useState } from 'react';

export type AnnotatePanelKind = 'help' | 'info' | 'manual' | 'forum';

// The field whose help the Uitleg panel should show. The nonce changes on every click, so asking
// twice for the same field scrolls to it again.
export interface HelpTarget {
  key: string;
  nonce: number;
}

// Which panel beside the form is open (one at a time), and which field's help it should show.
export function useAnnotatePanel() {
  const [open, setOpen] = useState<AnnotatePanelKind | null>(null);
  const [helpTarget, setHelpTarget] = useState<HelpTarget | null>(null);

  const toggle = useCallback((kind: AnnotatePanelKind) => {
    setHelpTarget(null);
    setOpen(current => (current === kind ? null : kind));
  }, []);

  const close = useCallback(() => setOpen(null), []);

  const showHelp = useCallback((key: string) => {
    setOpen('help');
    setHelpTarget(previous => ({ key, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  return { open, helpTarget, toggle, close, showHelp };
}
