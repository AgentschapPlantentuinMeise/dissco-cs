import { useTranslation } from 'react-i18next';
import { failedToLoad } from '../../api/query-state';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { PageSection } from '../../components/layout/PageSection';
import { FormField } from '../../components/ui/FormField';
import { inputClass } from '../../components/ui/input-styles';
import { LanguageForm } from './LanguageForm';
import { NameForm } from './NameForm';
import { PasswordForm } from './PasswordForm';
import { useMyAccount } from './use-my-account';
import { LoadingText } from '../../components/layout/LoadingText';

// The user's own account: name, preferred language, password and email address.
export function MyAccount() {
  const { t } = useTranslation('dissco-cs');
  const { accountQuery, profileQuery, saveName, saveLanguage, savePassword } = useMyAccount();
  const account = accountQuery.data;
  const profile = profileQuery.data;

  if (failedToLoad(accountQuery) || failedToLoad(profileQuery)) {
    return <PageLoadError />;
  }

  return (
    <>
      <PageHeader variant="compact" title={t('my_account_title')} lead={t('my_account_lead')} />
      {!account || !profile ? (
        <PageSection>
          <LoadingText />
        </PageSection>
      ) : (
        <>
          <PageSection title={t('my_account_name_title')} intro={t('my_account_name_intro')}>
            <NameForm currentName={account.name} saving={saveName.isPending} saved={saveName.isSuccess} onSave={name => saveName.mutate(name)} />
          </PageSection>
          <PageSection tone="white" title={t('my_account_language_title')} intro={t('my_account_language_intro')}>
            <LanguageForm
              currentLanguage={profile.preferredLanguage}
              saving={saveLanguage.isPending}
              saved={saveLanguage.isSuccess}
              onSave={language => saveLanguage.mutate(language)}
            />
          </PageSection>
          <PageSection title={t('my_account_password_title')} intro={t('my_account_password_intro')}>
            <PasswordForm
              saving={savePassword.isPending}
              saved={savePassword.isSuccess}
              error={savePassword.error}
              onSave={(input, onDone) => savePassword.mutate(input, { onSuccess: onDone })}
            />
          </PageSection>
          <PageSection tone="white" title={t('my_account_email_title')} intro={t('my_account_email_intro')}>
            <div className="max-w-md">
              <FormField label={t('my_account_email_label')}>
                <input value={account.email} readOnly className={`${inputClass} bg-gray-100 text-gray-600`} />
              </FormField>
            </div>
          </PageSection>
        </>
      )}
    </>
  );
}
