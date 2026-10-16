import { ButtonHTMLAttributes } from 'react';

// The house button from the style guide: 4px corners, semibold, a 1px lift on hover and an accent
// focus ring. Icon-only buttons, tabs, menu items and toggles are not buttons in this sense.
export type ButtonVariant = 'primary' | 'secondary' | 'on-dark' | 'on-dark-line' | 'text' | 'danger' | 'tertiary';
export type ButtonSize = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded font-semibold leading-tight no-underline cursor-pointer ' +
  'transition-[background-color,color,transform] duration-200 ' +
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cs-accent ' +
  'disabled:opacity-[0.65] disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cs-primary text-white border-transparent hover:bg-cs-dark',
  secondary: 'bg-transparent text-cs-primary border-cs-primary hover:bg-cs-primary hover:text-white',
  'on-dark': 'bg-cs-secondary text-white border-transparent hover:brightness-90',
  'on-dark-line': 'bg-transparent text-white border-white/75 hover:bg-white/[0.12]',
  text: 'bg-transparent text-cs-primary border-0 underline underline-offset-[3px]',
  danger: 'bg-red-600 text-white border-transparent hover:bg-red-700',
  tertiary: 'bg-cs-tertiary text-white border-transparent hover:brightness-90',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-[26px] py-[11px] text-[0.95rem] border-2',
  sm: 'px-3.5 py-1.5 text-[0.85rem] border-[1.5px]',
};

// A text button has no box, so only its font size follows the size.
const TEXT_SIZES: Record<ButtonSize, string> = {
  md: 'px-1 py-0 text-[0.95rem]',
  sm: 'px-1 py-0 text-[0.85rem]',
};

/** The classes of a Button, for a link that must look like one (e.g. a HrefLink to the login page). */
export function buttonClass({ variant = 'primary', size = 'md' }: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
  const lift = variant === 'text' ? '' : 'hover:-translate-y-px disabled:hover:translate-y-0';
  const sizing = variant === 'text' ? TEXT_SIZES[size] : SIZES[size];
  return `${BASE} ${VARIANTS[variant]} ${sizing} ${lift}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  // Shows a spinner and blocks the button while an action runs.
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, type = 'button', disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass({ variant, size })}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {loading && (
        <span aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
