import React from 'react';
import { useTranslation } from 'react-i18next';

// Takes the place of one part of a page that failed to load, while the rest of the page stays usable.
export function SectionLoadError() {
  const { t } = useTranslation('dissco-cs');
  return (
    <p role="alert" className="py-8 text-center text-gray-600 m-0">
      {t('error_section_load')}
    </p>
  );
}
