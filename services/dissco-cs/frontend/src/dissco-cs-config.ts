export const disscoCSConfig = {
  platformName: 'DoeDat',
  developer: 'Plantentuin Meise',
  developerUrl: 'https://www.plantentuinmeise.be',

  organisation: {
    nl: 'Plantentuin Meise',
    en: 'Meise Botanic Garden',
    fr: 'Jardin botanique de Meise',
    de: 'Botanischer Garten Meise',
  },

  logoUrl: new URL('./images/logoDoeDat.png', import.meta.url).href,
  heroBgUrl: new URL('./images/backgroundflower.png', import.meta.url).href,
  heroBgCredit: 'Maarten Strack van Schijndel',

  collectiesSlug: 'collecties',

  supportedLanguages: [
    { label: 'Nederlands', code: 'nl' },
    { label: 'English', code: 'en' },
    { label: 'Français', code: 'fr' },
    { label: 'Deutsch', code: 'de' },
  ] as const,
};
