import { CrowdsourcingTask } from '../types/crowdsourcing-task';
import { parseUrn } from './parse-urn';

export function buildTaskLink(task: CrowdsourcingTask): string {
  const projectSlug = task.metadata?.project?.slug;
  if (!projectSlug || !task.subject) return `/tasks/${task.id}`;
  const parsedSubject = parseUrn(task.subject);
  if (!parsedSubject) return `/tasks/${task.id}`;
  if (parsedSubject.type === 'manifest') {
    return `/explore/${projectSlug}/manifests/${parsedSubject.id}/annotate`;
  }
  if (parsedSubject.type === 'canvas' && task.subject_parent) {
    const parsedParent = parseUrn(task.subject_parent);
    if (parsedParent && parsedParent.type === 'manifest') {
      return `/explore/${projectSlug}/manifests/${parsedParent.id}/annotate`;
    }
  }
  return `/tasks/${task.id}`;
}
