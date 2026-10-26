import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LuPlus } from 'react-icons/lu';
import {
  HomeStepDto,
  MAX_HOME_STEP_BODY_LENGTH,
  MAX_HOME_STEP_TITLE_LENGTH,
  MAX_HOME_STEPS,
  SitePageLang,
  setHomeStepsSchema,
} from '@dissco-cs/shared-types';
import { homeStepsApi } from '../../../api/cs-client/home-steps';
import { homeStepKeys, homeStepQueries } from '../../../api/queries/home-steps';
import { Button } from '../../../components/ui/Button';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { MoveButtons } from '../../../components/ui/MoveButtons';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { SaveButton } from '../../../components/ui/SaveButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { defaultLang } from '../../../utility/site-lang-text';
import { inputClass } from '../../../components/ui/input-styles';
import { panelClass } from '../../../components/ui/panel-styles';

const EMPTY_STEP: HomeStepDto = { title: {}, body: {} };

// "How it works" on Home: up to four steps, edited together and saved as one list.
export function HomeSteps() {
  const { t, i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const { data: saved } = useQuery(homeStepQueries.list());
  // null while nothing was changed: the form then shows what is saved.
  const [draft, setDraft] = useState<HomeStepDto[] | null>(null);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const steps = draft ?? saved ?? [];

  const { mutate: save, isPending: saving, isSuccess: isSaved, reset: resetSaved } = useMutation({
    mutationFn: () => homeStepsApi.replace(steps),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: homeStepKeys.all });
      setDraft(null);
    },
  });

  const change = (next: HomeStepDto[]) => {
    setDraft(next);
    resetSaved();
  };

  const setText = (index: number, field: keyof HomeStepDto, value: string) =>
    change(steps.map((step, i) => (i === index ? { ...step, [field]: { ...step[field], [selectedLang]: value } } : step)));

  const move = (index: number, direction: -1 | 1) => {
    const next = [...steps];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    change(next);
  };

  const isMissing = (lang: SitePageLang) => steps.some(step => !step.title[lang]?.trim() || !step.body[lang]?.trim());
  const canSave = draft !== null && setHomeStepsSchema.safeParse({ steps }).success;

  return (
    <CsPage>
      <PageBody>
        <PageHeader
          variant="plain"
          back={{ href: '/manage', label: t('sm_back_to_hub') }}
          title={t('sm_home_steps_title')}
          lead={t('sm_home_steps_intro')}
        />

      <div className={panelClass}>
        <LanguageTabs selected={selectedLang} onSelect={setSelectedLang} isMissing={isMissing} />

        {steps.length === 0 && <p className="text-sm text-gray-500 mt-4">{t('sm_home_steps_none')}</p>}

        <ol className="list-none m-0 p-0 mt-4 flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={index} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 items-start">
              <span className="text-2xl font-bold text-cs-primary leading-none pt-2 tabular-nums">{index + 1}</span>
              <div className="flex flex-col gap-2 min-w-0">
                <input
                  type="text"
                  value={step.title[selectedLang] ?? ''}
                  onChange={e => setText(index, 'title', e.target.value)}
                  maxLength={MAX_HOME_STEP_TITLE_LENGTH}
                  aria-label={t('sm_home_steps_step_title')}
                  placeholder={t('sm_home_steps_step_title')}
                  className={`${inputClass} font-semibold`}
                />
                <textarea
                  value={step.body[selectedLang] ?? ''}
                  onChange={e => setText(index, 'body', e.target.value)}
                  maxLength={MAX_HOME_STEP_BODY_LENGTH}
                  aria-label={t('sm_home_steps_step_body')}
                  placeholder={t('sm_home_steps_step_body')}
                  className={`${inputClass} min-h-[70px]`}
                />
              </div>
              <span className="flex items-center gap-1 pt-1.5">
                <MoveButtons index={index} count={steps.length} onMove={direction => move(index, direction)} />
                <DeleteIconButton onClick={() => change(steps.filter((_, i) => i !== index))} />
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          {steps.length < MAX_HOME_STEPS && (
            <Button variant="secondary" size="sm" onClick={() => change([...steps, EMPTY_STEP])}>
              <LuPlus aria-hidden="true" /> {t('sm_home_steps_add')}
            </Button>
          )}
          <SaveButton
            onClick={() => save()}
            loading={saving}
            disabled={!canSave}
            title={draft !== null && !canSave ? t('common_fill_required_fields') : undefined}
          />
          {isSaved && <SavedNotice />}
        </div>
      </div>
      </PageBody>
    </CsPage>
  );
}
