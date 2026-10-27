import { useTranslation } from 'react-i18next';
import { CsPage } from './CsPage';
import { PageError } from './PageError';
import { buttonClass } from '../ui/Button';
import { HrefLink } from '../../utility/href-link';

// The way out of an error page, e.g. back to the list the page belongs to.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <HrefLink href={href} className={buttonClass({ variant: 'secondary' })}>
      {label}
    </HrefLink>
  );
}

// Something that does not exist: an address nobody routes, or a project or institution the server
// answered 404 for. Not an error the user can retry, so a status with a way back instead.
export function PageNotFound({ text, back }: { text: string; back: { href: string; label: string } }) {
  const { t } = useTranslation('dissco-cs');
  return (
    <CsPage>
      <PageError role="status" title={t('error_not_found_title')} text={text}>
        <BackLink {...back} />
      </PageError>
    </CsPage>
  );
}
