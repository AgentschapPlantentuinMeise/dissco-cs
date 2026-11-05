import { useTranslation } from 'react-i18next';
import { IconType } from 'react-icons';
import { LuBookOpen, LuCircleHelp, LuInfo, LuMessageSquare } from 'react-icons/lu';
import { AnnotatePanelKind } from './use-annotate-panel';

const ITEMS: { kind: AnnotatePanelKind; icon: IconType; labelKey: string; tooltipKey?: string }[] = [
  { kind: 'help', icon: LuCircleHelp, labelKey: 'annotate_panel_help' },
  { kind: 'info', icon: LuInfo, labelKey: 'annotate_panel_info', tooltipKey: 'annotate_info_title' },
  { kind: 'manual', icon: LuBookOpen, labelKey: 'annotate_panel_manual' },
  { kind: 'forum', icon: LuMessageSquare, labelKey: 'annotate_panel_forum' },
];

// The row above the form: each button opens its panel beside the form, and closes it again. Not
// tabs -- the form stays. Aligned right, above where the panel opens; below xl only the icons fit.
export function AnnotateHelpBar({ open, onToggle, hidden }: {
  open: AnnotatePanelKind | null;
  onToggle: (kind: AnnotatePanelKind) => void;
  // Panels not offered here, e.g. the forum on a submitted task or the manual of a project without one.
  hidden: Partial<Record<AnnotatePanelKind, boolean>>;
}) {
  const { t } = useTranslation('dissco-cs');

  return (
    <nav aria-label={t('annotate_help_bar_label')} className="flex-shrink-0 flex justify-end gap-5 px-4 bg-gray-50 border-b border-gray-200">
      {ITEMS.filter(item => !hidden[item.kind]).map(({ kind, icon: Icon, labelKey, tooltipKey }) => {
        const isOpen = open === kind;
        const label = t(labelKey);
        const tooltip = t(tooltipKey ?? labelKey);
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isOpen}
            aria-label={tooltip}
            title={tooltip}
            onClick={() => onToggle(kind)}
            className={`inline-flex items-center gap-1.5 py-2 border-0 border-b-2 bg-transparent text-[0.82rem] cursor-pointer transition-colors duration-150 ${
              isOpen ? 'border-b-cs-primary text-cs-primary font-semibold' : 'border-b-transparent text-gray-500 hover:text-cs-primary'
            }`}
          >
            <Icon aria-hidden="true" className="text-base" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
