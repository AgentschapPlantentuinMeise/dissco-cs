import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { projectDebugApi } from '../../../api/cs-api';
import { Select } from '../../../components/Select';
import { useAutoSelectFirstSlug } from '../../../hooks/use-auto-select-first-slug';
import { localeText } from '../../../utility/locale-text';
import { MadocProjectListItem } from '@dissco-cs/shared-types';

function taskDebugStatusLabel(status: number): string {
  switch (status) {
    case -1: return 'Rejected';
    case 0: return 'Not started';
    case 1: return 'In progress';
    case 2: return 'In review';
    case 3: return 'Done';
    case 4: return 'Changes requested';
    default: return `Unknown (${status})`;
  }
}

// DEBUG-ONLY tab, opzettelijk niet vertaald (t()) zodat dit blok later in één keer weg te
// halen is. Toont per manifest van een gekozen project welke crowdsourcing-task(s) eraan
// hangen en of ze meetellen in het getranscribeerd-percentage (status "in review" of "done")
// -- zodat dat percentage op de projectpagina visueel te controleren is.
export const TaskDebugSubview: React.FC<{ projects: MadocProjectListItem[] }> = ({ projects }) => {
  const { i18n } = useTranslation('dissco-cs');
  const [selectedSlug, setSelectedSlug] = useState<string>('');

  useAutoSelectFirstSlug(projects, selectedSlug, setSelectedSlug);

  const selectedProject = projects.find(p => p.slug === selectedSlug) ?? null;

  const { data, status: queryStatus } = useQuery(
    ['project-task-debug', selectedProject?.id],
    () => projectDebugApi.getTaskStatus(selectedProject!.id),
    { enabled: !!selectedProject, staleTime: 0 }
  );

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Debug view: shows every manifest of the selected project, its crowdsourcing task(s) and status, and whether it
        counts towards the "transcribed" percentage shown on the project page (only "In review" or "Done" count).
      </p>

      <div className="mb-5 max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
        <Select
          value={selectedSlug}
          onChange={e => setSelectedSlug(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2"
        >
          {projects.map(project => (
            <option key={project.slug} value={project.slug}>
              {localeText(project.label, i18n.language) || project.slug}
            </option>
          ))}
        </Select>
      </div>

      {queryStatus === 'loading' && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <>
          <div className="flex gap-6 mb-5 text-sm">
            <div><span className="font-semibold">Total manifests:</span> {data.totalManifests}</div>
            <div><span className="font-semibold">Computed percentage:</span> {data.transcribedPercentage}%</div>
          </div>

          <div className="bg-white border-t border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 font-bold">Manifest</th>
                  <th className="px-4 py-3 font-bold">Tasks</th>
                  <th className="px-4 py-3 font-bold">Counts towards %</th>
                </tr>
              </thead>
              <tbody>
                {data.manifests.map(manifest => (
                  <tr key={manifest.manifestId} className={manifest.countsAsTranscribed ? 'bg-green-50' : ''}>
                    <td className="px-4 py-3 border-t border-gray-100">
                      {localeText(manifest.label, i18n.language) || `#${manifest.manifestId}`}
                      <span className="text-xs text-gray-400 ml-1">#{manifest.manifestId}</span>
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                      {manifest.tasks.length === 0 ? (
                        <span className="text-gray-400">No tasks</span>
                      ) : (
                        <ul className="list-none m-0 p-0 space-y-1">
                          {manifest.tasks.map(task => (
                            <li key={task.id}>
                              {taskDebugStatusLabel(task.status)}
                              {task.assignee ? ` — ${task.assignee}` : ''}
                              {' · '}
                              {new Date(task.modified_at).toLocaleDateString(i18n.language)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm">
                      {manifest.countsAsTranscribed ? (
                        <span className="text-green-700 font-semibold">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
