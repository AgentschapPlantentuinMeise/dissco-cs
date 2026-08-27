import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../Select';

export type MessageFormData = { title: string; taskUrl: string; body: string; projectSlug?: string; projectLabel?: string };

type ProjectOption = { slug: string; label: string };

type Props = {
  onSubmit: (data: MessageFormData) => void;
  onCancel?: () => void;
  initialTaskUrl?: string;
  // Set by AnnotatePage — the task link is already fixed by context there, same reasoning as
  // fixedProjectLabel below, so it's shown but not editable.
  taskUrlReadOnly?: boolean;
  // Only offered when the parent supplies options — MessageBoard's standalone "new message" form
  // passes the site's project list; AnnotatePage omits this because the project is already fixed
  // by the task the user is on (see fixedProjectLabel instead), so no dropdown is shown there.
  projectOptions?: ProjectOption[];
  // Read-only counterpart to projectOptions — AnnotatePage passes the current task's project name
  // here so the user can see which project gets linked, without being able to change it (the
  // actual projectSlug/projectLabel are attached by the caller outside this form's data).
  fixedProjectLabel?: string;
};

const inputClass = 'py-[9px] px-3 border border-gray-300 rounded text-[0.95rem] font-[inherit] resize-y transition-colors duration-200 focus:outline-none focus:border-[var(--cs-primary)]';
const labelClass = 'flex flex-col gap-[5px] text-[0.9rem] font-medium text-gray-800';

export const MessageForm: React.FC<Props> = ({
  onSubmit,
  onCancel,
  initialTaskUrl = '',
  taskUrlReadOnly,
  projectOptions,
  fixedProjectLabel,
}) => {
  const { t } = useTranslation('dissco-cs');

  const [fields, setFields] = useState<MessageFormData>({ title: '', taskUrl: initialTaskUrl, body: '', projectSlug: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.title.trim() || !fields.body.trim()) return;
    const selectedProject = projectOptions?.find(p => p.slug === fields.projectSlug);
    onSubmit({ ...fields, projectSlug: selectedProject?.slug, projectLabel: selectedProject?.label });
    setFields({ title: '', taskUrl: initialTaskUrl, body: '', projectSlug: '' });
  };

  return (
    <form className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 flex flex-col gap-[14px]" onSubmit={handleSubmit}>
      <h2 className="m-0 mb-2 text-[1.1rem] text-[var(--cs-primary)]">{t('forum_form_title') || 'Nieuw bericht'}</h2>
      <label className={labelClass}>
        {t('forum_form_label_title') || 'Titel'} *
        <input
          className={inputClass}
          type="text"
          value={fields.title}
          onChange={e => setFields(p => ({ ...p, title: e.target.value }))}
          placeholder={t('forum_form_placeholder_title') || 'Korte omschrijving van je vraag'}
          required
        />
      </label>
      <label className={labelClass}>
        {t('forum_form_label_link') || 'Link naar taak'}
        <input
          className={`${inputClass}${taskUrlReadOnly ? ' bg-gray-100 text-gray-600 cursor-default' : ''}`}
          type="url"
          value={fields.taskUrl}
          onChange={e => setFields(p => ({ ...p, taskUrl: e.target.value }))}
          placeholder={'https://...'}
          readOnly={taskUrlReadOnly}
        />
      </label>
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
            <Select
              className={inputClass}
              value={fields.projectSlug}
              onChange={e => setFields(p => ({ ...p, projectSlug: e.target.value }))}
            >
              <option value="">{t('forum_form_project_none') || '— Geen project —'}</option>
              {projectOptions.map(p => (
                <option key={p.slug} value={p.slug}>{p.label}</option>
              ))}
            </Select>
          </label>
        )
      )}
      <label className={labelClass}>
        {t('forum_form_label_body') || 'Bericht'} *
        <textarea
          className={inputClass}
          value={fields.body}
          onChange={e => setFields(p => ({ ...p, body: e.target.value }))}
          placeholder={t('forum_form_placeholder_body') || 'Beschrijf je vraag...'}
          rows={4}
          required
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-[var(--cs-primary)] text-white border-none px-[18px] py-[10px] rounded text-[0.95rem] font-medium cursor-pointer transition-colors duration-200 hover:bg-[var(--cs-dark)]"
        >
          {t('forum_form_submit') || 'Verstuur'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="bg-transparent border border-gray-300 px-3 py-1.5 rounded text-[0.85rem] text-gray-600 cursor-pointer whitespace-nowrap transition-[border-color,color] duration-200 hover:border-[var(--cs-primary)] hover:text-[var(--cs-primary)]"
            onClick={onCancel}
          >
            {t('common_cancel') || 'Annuleren'}
          </button>
        )}
      </div>
    </form>
  );
};
