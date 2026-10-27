import React from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from './CsPage';
import { PageError } from './PageError';
import { BackLink, PageNotFound } from './PageNotFound';
import { Button } from '../ui/Button';
import { isNotFound } from '../../api/cs-client/request';

interface PageLoadErrorProps {
  // The error of the page's main query; only needed together with notFoundText.
  error?: unknown;
  // Shown instead of the load error when the server answered 404, e.g. a mistyped address.
  notFoundText?: string;
  // A way out, e.g. back to the list the page belongs to.
  back?: { href: string; label: string };
}

// Shown instead of a page whose main content failed to load, so the user never mistakes a failure
// for "there is nothing here". A full reload retries every query of the page at once.
export function PageLoadError({ error, notFoundText, back }: PageLoadErrorProps) {
  const { t } = useTranslation('dissco-cs');

  if (notFoundText && back && isNotFound(error)) {
    return <PageNotFound text={notFoundText} back={back} />;
  }

  return (
    <CsPage>
      <PageError title={t('error_page_load_title')} text={t('error_page_load_text')}>
        <Button onClick={() => window.location.reload()}>{t('error_page_load_retry')}</Button>
        {back && <BackLink {...back} />}
      </PageError>
    </CsPage>
  );
}
