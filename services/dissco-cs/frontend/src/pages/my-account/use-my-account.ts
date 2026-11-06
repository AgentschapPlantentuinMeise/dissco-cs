import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SitePageLang } from '@dissco-cs/shared-types';
import { changeName, changePassword } from '../../api/madoc-auth/auth';
import { userProfileApi } from '../../api/cs-client/user-profile';
import { authKeys, authQueries } from '../../api/queries/auth';
import { userProfileKeys, userProfileQueries } from '../../api/queries/user-profile';
import { changeLanguage, clearLanguageChoice } from '../../utility/change-language';

// The account page: the user's Madoc account and their profile, and the three things to save.
export function useMyAccount() {
  const { i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const accountQuery = useQuery(authQueries.account());
  const profileQuery = useQuery(userProfileQueries.get());

  const saveName = useMutation({
    mutationFn: async (name: string) => {
      await changeName({ name });
      await userProfileApi.syncName();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.account() }),
  });

  const saveLanguage = useMutation({
    mutationFn: (language: SitePageLang | null) => userProfileApi.setLanguage(language),
    onSuccess: (_result, language) => {
      if (language) changeLanguage(i18n, language);
      else clearLanguageChoice(i18n);
      return queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
    },
  });

  // The form shows Madoc's refusal itself, such as a wrong current password.
  const savePassword = useMutation({ mutationFn: changePassword, meta: { handlesOwnError: true } });

  return { accountQuery, profileQuery, saveName, saveLanguage, savePassword };
}
