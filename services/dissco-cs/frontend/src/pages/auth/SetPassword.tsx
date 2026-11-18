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
import { isNewPasswordValid, withNewPasswordRules } from '../../components/auth/password-requirements';
import { authErrorKey } from './auth-error';
import { z } from 'zod';
import { useValidatedForm } from '../../hooks/use-validated-form';
import { FormError } from '../../components/ui/FormError';

const setPasswordSchema = withNewPasswordRules(z.object({ password: z.string(), confirmPassword: z.string() }));

export function SetPassword() {
  const { t } = useTranslation('dissco-cs');
  const location = useLocation();
  const isActivation = location.pathname.endsWith('/activate-account');
  const [searchParams] = useSearchParams();
  const c1 = searchParams.get('c1') || '';
  const c2 = searchParams.get('c2') || '';

  const form = useValidatedForm(setPasswordSchema, { password: '', confirmPassword: '' });
  const [password, confirmPassword] = form.watch(['password', 'confirmPassword']);
  const linkQuery = useQuery(authQueries.resetLink(c1, c2));

  const canSubmit = isNewPasswordValid(password, confirmPassword);

  const save = useMutation({
    mutationFn: (values: { password: string }) => submitSetPassword({ c1, c2, password: values.password }),
    onSuccess: () => {
      const siteRoot = `/s/${getSiteSlug()}/`;
      window.location.href = isActivation ? `${siteRoot}?welcome=1` : siteRoot;
    },
    meta: { handlesOwnError: true },
  });

  // A fault while checking the link is not an expired link.
  if (failedToLoad(linkQuery)) {
    return <PageLoadError />;
  }

  if (!c1 || !c2 || linkQuery.data?.valid === false) {
    return (
      <CsPage>
        <PageBody width="narrow">
          <PageHeader variant="plain" title={t('set_password_title')} />
          <FormError>{t('set_password_invalid_link')}</FormError>
        </PageBody>
      </CsPage>
    );
  }

  return (
    <CsPage>
      <PageBody width="narrow">
        <PageHeader variant="plain" title={t('set_password_title')} lead={t('set_password_intro')} />

        <form noValidate onSubmit={form.handleSubmit(values => save.mutate(values))} className="flex flex-col gap-4">
          <NewPasswordFields
            password={password}
            passwordProps={form.field('password', { deps: 'confirmPassword' })}
            passwordError={form.errorFor('password')}
            confirmProps={form.field('confirmPassword')}
            confirmError={form.errorFor('confirmPassword')}
          />

          {save.isError && <FormError>{t(authErrorKey(save.error, 'set_password_form_error'))}</FormError>}

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
