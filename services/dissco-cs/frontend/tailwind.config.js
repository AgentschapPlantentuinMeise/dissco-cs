// Tailwind 3 has no package exports map, so an ES module needs the file name with .js.
import colors from 'tailwindcss/colors.js';

// The brand colors read the CSS variables (citizen-science-theme.css holds the defaults), so a
// palette set per site at runtime also changes every Tailwind class. The relative color syntax keeps
// opacity modifiers working: bg-cs-primary/10.
const fromVar = name => `rgb(from var(--cs-${name}) r g b / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // top-navbar, pt-navbar: the height of the fixed navbar (--cs-navbar-height in the theme).
      spacing: {
        navbar: 'var(--cs-navbar-height)',
      },
      colors: {
        cs: {
          primary: fromVar('primary'),
          secondary: fromVar('secondary'),
          accent: fromVar('accent'),
          dark: fromVar('dark'),
          tertiary: fromVar('tertiary'),
        },
        // Signal colors, named after what they mean: the same on every site, with every shade
        // (text-danger-700, bg-attention-50). Changing one here changes it everywhere.
        danger: colors.red, // errors, required fields, deleting
        success: colors.green, // saved, a requirement met
        attention: colors.amber, // announcements, warnings, "look here"
        award: colors.amber, // the winner of the quarter pool; its own name, so it can change on its own
      },
    },
  },
  plugins: [],
};
