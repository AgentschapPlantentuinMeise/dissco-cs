// The brand colors read the CSS variables (citizen-science-theme.css holds the defaults), so a
// palette set per site at runtime also changes every Tailwind class. The relative color syntax keeps
// opacity modifiers working: bg-cs-primary/10.
const fromVar = name => `rgb(from var(--cs-${name}) r g b / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cs: {
          primary: fromVar('primary'),
          secondary: fromVar('secondary'),
          accent: fromVar('accent'),
          dark: fromVar('dark'),
          tertiary: fromVar('tertiary'),
        },
      },
    },
  },
  plugins: [],
};
