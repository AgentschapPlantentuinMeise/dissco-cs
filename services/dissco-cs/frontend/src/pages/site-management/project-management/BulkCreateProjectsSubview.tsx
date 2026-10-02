import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, queryCache } from 'react-query';
import { createProject, exportProject, getProjectStructure, updateProjectStatus } from '../../../api/madoc-client/projects';
import { getAllAdminCollections, updateCollectionStructure } from '../../../api/madoc-client/collections';
import { Select } from '../../../components/Select';
import { slugify } from '../../../utility/slugify';
import { localeText } from '../../../utility/locale-text';
import { defaultLang } from '../../../utility/site-lang-text';
import { MadocProjectDto } from '@dissco-cs/shared-types';

// Creates `count` real Madoc projects sequentially, via the exact same route the "New project" /
// "Duplicate" admin UI uses (createProject) -- so each one gets a proper collection, capture
// model and root task, unlike hand-rolled SQL seeding. Sequential (not Promise.all): each
// createProject call already does several steps server-side, and firing many at once is what
// caused a prior outage when load-testing with raw SQL-seeded projects instead.
export const BulkCreateProjectsSubview: React.FC<{ projects: MadocProjectDto[] }> = ({ projects }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const [count, setCount] = useState(5);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceSlug, setSourceSlug] = useState('');
  const [manifestCollectionIds, setManifestCollectionIds] = useState<string[]>([]);
  const { data: collections = [] } = useQuery('admin-collections', getAllAdminCollections);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [errors, setErrors] = useState<{ index: number; message: string }[]>([]);
  const stopRef = useRef(false);

  const canSubmit = !running && count > 0 && count <= 500 && title.trim().length > 0 && description.trim().length > 0;

  const run = async () => {
    setRunning(true);
    setFinished(false);
    setErrors([]);
    stopRef.current = false;

    const lang = defaultLang(i18n.language);
    const slugBase = slugify(title);
    const runSuffix = Date.now().toString(36);

    const sourceProject = sourceSlug ? projects.find(p => p.slug === sourceSlug) : null;
    const remoteTemplate = sourceProject ? await exportProject(sourceProject.id) : null;

    let done = 0;
    let failed = 0;
    const collectedErrors: { index: number; message: string }[] = [];

    for (let i = 1; i <= count; i++) {
      if (stopRef.current) break;
      try {
        const newProject = await createProject({
          label: { [lang]: [`${title.trim()} ${i}`] },
          summary: { [lang]: [description.trim()] },
          slug: `${slugBase}-${runSuffix}-${i}`,
          ...(remoteTemplate ? { template: 'remote' as const, remote_template: remoteTemplate } : {}),
          ...(sourceProject ? { duplicate_project_id: sourceProject.id } : {}),
        });

        if (manifestCollectionIds.length > 0) {
          const structure = await getProjectStructure(newProject.id);
          await updateCollectionStructure(structure.collectionId, manifestCollectionIds.map(Number));
        }

        await updateProjectStatus(newProject.id, 1);
      } catch (err) {
        failed += 1;
        collectedErrors.push({ index: i, message: err instanceof Error ? err.message : String(err) });
      }
      done += 1;
      setProgress({ done, total: count, failed });
    }

    setErrors(collectedErrors);
    setRunning(false);
    setFinished(true);
    queryCache.invalidateQueries('site-projects');
  };

  return (
    <div className="max-w-xl">
      <p className="text-sm text-gray-600 mb-6">{t('sm_bulk_intro')}</p>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sm_bulk_count_label')}</label>
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={e => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            disabled={running}
            className="w-full border border-gray-300 rounded-lg p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sm_bulk_source_label')}</label>
          <Select
            value={sourceSlug}
            onChange={e => setSourceSlug(e.target.value)}
            disabled={running}
            className="w-full border border-gray-300 rounded-lg p-2"
          >
            <option value="">{t('sm_bulk_source_none')}</option>
            {projects.map(project => (
              <option key={project.slug} value={project.slug}>
                {localeText(project.label, i18n.language) || project.slug}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sm_bulk_manifest_label')}</label>
        <select
          multiple
          value={manifestCollectionIds}
          onChange={e => setManifestCollectionIds(Array.from(e.target.selectedOptions, option => option.value))}
          disabled={running}
          size={Math.min(6, Math.max(3, collections.length))}
          className="w-full border border-gray-300 rounded-lg p-2"
        >
          {collections.map(collection => (
            <option key={collection.id} value={collection.id}>
              {localeText(collection.label, i18n.language) || collection.slug} — {t('sm_bulk_manifest_item_count', { count: collection.itemCount ?? 0 })}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1.5">{t('sm_bulk_manifest_hint')}</p>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sm_bulk_title_label')}</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={running}
          placeholder={t('sm_bulk_title_placeholder')}
          className="w-full border border-gray-300 rounded-lg p-2"
        />
        <p className="text-xs text-gray-500 mt-1.5">{t('sm_bulk_title_hint')}</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sm_bulk_description_label')}</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={running}
          placeholder={t('sm_bulk_description_placeholder')}
          className="w-full min-h-[90px] border border-gray-300 rounded-lg p-2"
        />
      </div>

      <div className="flex items-center gap-3">
        {!running ? (
          <button
            onClick={() => void run()}
            disabled={!canSubmit}
            className={`text-sm font-semibold px-4 py-2 rounded-full border-none ${
              canSubmit
                ? 'bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {t('sm_bulk_submit')}
          </button>
        ) : (
          <button
            onClick={() => {
              stopRef.current = true;
            }}
            className="text-sm font-semibold text-red-700 border border-red-200 bg-red-50 rounded-lg px-4 py-2 cursor-pointer hover:bg-red-100"
          >
            {t('sm_bulk_stop')}
          </button>
        )}
        {progress.total > 0 && (running || finished) && (
          <span className="text-sm text-gray-600">
            {t('sm_bulk_progress', { done: progress.done, total: progress.total, failed: progress.failed })}
          </span>
        )}
      </div>

      {progress.total > 0 && (running || finished) && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3 max-w-sm">
          <div
            className="h-full bg-[var(--cs-primary)] transition-[width] duration-300 ease-in-out"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

      {finished && (
        <p className="text-sm text-green-700 mt-3">
          {t('sm_bulk_done', { created: progress.done - progress.failed, failed: progress.failed })}
        </p>
      )}

      {errors.length > 0 && (
        <ul className="text-xs text-red-700 mt-2 list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
          {errors.slice(0, 20).map(err => (
            <li key={err.index}>
              {t('sm_bulk_error_prefix', { index: err.index })} {err.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
