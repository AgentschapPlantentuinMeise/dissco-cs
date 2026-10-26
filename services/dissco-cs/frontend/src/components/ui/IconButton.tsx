import { IconType } from 'react-icons';

// A button that is only an icon (style guide, "Bedieningselementen"): grey, teal on hover. The
// label is required because a screen reader has nothing else to read; it is also the tooltip.
export function IconButton({ icon: Icon, label, onClick, disabled, className = '' }: {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  // Only for placing the button, e.g. inside an input field.
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex items-center bg-transparent border-none cursor-pointer p-1 text-base text-gray-500 transition-colors duration-200 hover:text-cs-primary disabled:opacity-25 disabled:cursor-not-allowed ${className}`}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
