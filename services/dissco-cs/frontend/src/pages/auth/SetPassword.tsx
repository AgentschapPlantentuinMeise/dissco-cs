import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { setPassword as submitSetPassword } from '../../api/madoc-auth/auth';
import { authQueries } from '../../api/queries/auth';
import { failedToLoad } from '../../api/query-state';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { getSiteSlug } from '../../api/slug';
import { NewPasswordFields } from '../../components/auth/NewPasswordFields';
import { isNewPasswordValid } from '../../components/auth/password-requirements';
import { authErrorKey } from './auth-error';

export function SetPassword() {
  const { t } = useTranslation('dissco-cs');
  const location = useLocation();
  const isActivation = location.pathname.endsWith('/activate-account');
  const [searchParams] = useSearchParams();
  const c1 = searchParams.get('c1') || '';
  const c2 = searchParams.get('c2') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const linkQuery = useQuery(authQueries.resetLink(c1, c2));

  const canSubmit = isNewPasswordValid(password, confirmPassword);

  const save = useMutation({
    mutationFn: () => submitSetPassword({ c1, c2, password }),
    onSuccess: () => {
      const siteRoot = `/s/${getSiteSlug()}/`;
      window.location.href = isActivation ? `${siteRoot}?welcome=1` : siteRoot;
    },
    meta: { handlesOwnError: true },
  });

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (canSubmit) save.mutate();
  };

  // A fault while checking the link is not an expired link.
  if (failedToLoad(linkQuery)) {
    return <PageLoadError />;
  }

  if (!c1 || !c2 || linkQuery.data?.valid === false) {
    return (
      <CsPage>
        <PageBody width="narrow">
          <PageHeader variant="plain" title={t('set_password_title')} />
          <p className="text-red-700">{t('set_password_invalid_link')}</p>
        </PageBody>
      </CsPage>
    );
  }

  return (
    <CsPage>
      <PageBody width="narrow">
        <PageHeader variant="plain" title={t('set_password_title')} lead={t('set_password_intro')} />

        <form onSubmit={submit} className="flex flex-col gap-4">
          <NewPasswordFields
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
          />

          {save.isError && <p className="text-red-700">{t(authErrorKey(save.error, 'set_password_form_error'))}</p>}

          <div>
            <Button type="submit" disabled={!canSubmit} loading={save.isPending}>
              {t('set_password_form_submit')}
            </Button>
          </div>
        </form>
      </PageBody>
    </CsPage>
  );
}
