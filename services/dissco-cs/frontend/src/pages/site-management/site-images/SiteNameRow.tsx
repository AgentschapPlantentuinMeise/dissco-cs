import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MAX_SITE_NAME_LENGTH } from '@dissco-cs/shared-types';
import { siteThemeApi } from '../../../api/cs-client/site-theme';
import { siteThemeKeys, siteThemeQueries } from '../../../api/queries/site-theme';
import { SaveButton } from '../../../components/ui/SaveButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { rowHoverClass } from '../../../components/ui/list-styles';
import { inputClass } from '../../../components/ui/input-styles';
import { disscoCSConfig } from '../../../dissco-cs-config';

// The site's own name, next to its logo: a site that swaps in its own logo renames itself here too.
export function SiteNameRow() {
  const { t } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const { data } = useQuery(siteThemeQueries.get());
  const stored = data?.name ?? '';
  const [draft, setDraft] = useState(stored);

  // Follows the saved name (after a save), not every keystroke.
  useEffect(() => setDraft(stored), [stored]);

  const { mutate: save, isPending: saving, isSuccess: saved } = useMutation({
    mutationFn: () => siteThemeApi.setName(draft.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: siteThemeKeys.all }),
  });
  const unchanged = draft.trim() === stored;

  return (
    <li className={`flex flex-wrap items-center gap-4 px-4 py-4 ${rowHoverClass}`}>
      <span className="w-28 font-semibold">{t('sm_site_name_label')}</span>
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            aria-label={t('sm_site_name_label')}
            placeholder={disscoCSConfig.platformName}
            maxLength={MAX_SITE_NAME_LENGTH}
            className={`${inputClass} w-72 max-w-full`}
          />
          <SaveButton onClick={() => save()} loading={saving} disabled={unchanged} />
          {saved && unchanged && <SavedNotice />}
        </span>
        <span className="text-sm text-gray-500">{t('sm_site_name_hint', { name: disscoCSConfig.platformName })}</span>
      </div>
    </li>
  );
}
