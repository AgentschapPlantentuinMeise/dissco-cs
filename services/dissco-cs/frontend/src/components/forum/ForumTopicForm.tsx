import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/input-styles';
import { hasDraftChanged } from '../../utility/draft-changes';
import {
  ForumTopicInput,
  forumTopicInputSchema,
  MAX_FORUM_BODY_LENGTH,
  MAX_FORUM_TASK_URL_LENGTH,
  MAX_FORUM_TITLE_LENGTH,
} from '@dissco-cs/shared-types';
import { FormField } from '../ui/FormField';
import { useValidatedForm } from '../../hooks/use-validated-form';

type ProjectOption = { slug: string; label: string };

type Props = {
  onSubmit: (data: ForumTopicInput) => void;
  onCancel?: () => void;
  // Tells the parent whether anything is filled in: the actions that close this form are the
  // parent's, also those outside the form, so the parent asks before throwing the input away.
  onDirtyChange?: (isDirty: boolean) => void;
  initialTaskUrl?: string;
  // Set by AnnotatePage — the task link is already fixed by context there, same reasoning as
  // fixedProjectLabel below, so it's shown but not editable.
  taskUrlReadOnly?: boolean;
  // Only offered when the parent supplies options — Forum's standalone "new message" form
  // passes the site's project list; AnnotatePage omits this because the project is already fixed
  // by the task the user is on (see fixedProjectLabel instead), so no dropdown is shown there.
  projectOptions?: ProjectOption[];
  // Read-only counterpart to projectOptions — AnnotatePage passes the current task's project name
  // here so the user can see which project gets linked, without being able to change it (the
  // actual projectSlug/projectLabel are attached by the caller outside this form's data).
  fixedProjectLabel?: string;
};

const labelClass = 'flex flex-col gap-[5px] text-[0.9rem] font-medium text-gray-800';

export function ForumTopicForm({
  onSubmit,
  onCancel,
  onDirtyChange,
  initialTaskUrl = '',
  taskUrlReadOnly,
  projectOptions,
  fixedProjectLabel,
}: Props) {
  const { t } = useTranslation('dissco-cs');

  // In state: the annotate page passes the current URL, which must not count as an edit after
  // moving to another task with this form still open.
  const [emptyFields] = useState<ForumTopicInput>({
    title: '',
    taskUrl: initialTaskUrl,
    body: '',
    projectSlug: '',
    projectLabel: '',
  });
  const form = useValidatedForm(forumTopicInputSchema, emptyFields);

  const isDirty = hasDraftChanged(form.watch(), emptyFields);
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = form.handleSubmit(values => {
    const selectedProject = projectOptions?.find(p => p.slug === values.projectSlug);
    onSubmit({ ...values, projectSlug: selectedProject?.slug ?? null, projectLabel: selectedProject?.label ?? null });
    form.reset(emptyFields);
  });

  return (
    <form noValidate className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 flex flex-col gap-[14px]" onSubmit={handleSubmit}>
      <h2 className="m-0 mb-2 text-[1.1rem] text-cs-primary">{t('forum_form_title') || 'Nieuw bericht'}</h2>
      <FormField label={`${t('forum_form_label_title') || 'Titel'} *`} error={form.errorFor('title')}>
        <input
          {...form.field('title')}
          className={inputClass}
          type="text"
          maxLength={MAX_FORUM_TITLE_LENGTH}
          placeholder={t('forum_form_placeholder_title') || 'Korte omschrijving van je vraag'}
        />
      </FormField>
      <FormField label={t('forum_form_label_link') || 'Link naar taak'} error={form.errorFor('taskUrl')}>
        <input
          {...form.field('taskUrl')}
          className={`${inputClass}${taskUrlReadOnly ? ' bg-gray-100 text-gray-600 cursor-default' : ''}`}
          type="url"
          maxLength={MAX_FORUM_TASK_URL_LENGTH}
          placeholder={'https://...'}
          readOnly={taskUrlReadOnly}
        />
      </FormField>
      {fixedProjectLabel ? (
        <div className={labelClass}>
          {t('forum_form_label_project') || 'Project'}
          <div className="py-[9px] px-3 border border-gray-200 rounded text-[0.95rem] bg-gray-100 text-gray-600">
            {fixedProjectLabel}
          </div>
        </div>
      ) : (
        projectOptions &&
        projectOptions.length > 0 && (
          <label className={labelClass}>
            {t('forum_form_label_project') || 'Project'}
            <Select {...form.register('projectSlug')} value={form.watch('projectSlug') ?? ''} className={inputClass}>
              <option value="">{t('forum_form_project_none')}</option>
              {projectOptions.map(p => (
                <option key={p.slug} value={p.slug}>{p.label}</option>
              ))}
            </Select>
          </label>
        )
      )}
      <FormField label={`${t('forum_form_label_body') || 'Bericht'} *`} error={form.errorFor('body')}>
        <textarea
          {...form.field('body')}
          className={inputClass}
          maxLength={MAX_FORUM_BODY_LENGTH}
          placeholder={t('forum_form_placeholder_body') || 'Beschrijf je vraag...'}
          rows={4}
        />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t('forum_form_submit') || 'Verstuur'}
        </Button>
        {onCancel && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {t('common_cancel') || 'Annuleren'}
          </Button>
        )}
      </div>
    </form>
  );
}
