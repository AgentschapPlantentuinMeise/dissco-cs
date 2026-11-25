import { MadocCrowdsourcingTaskDto, MyTaskDto } from '@dissco-cs/shared-types';
import { parseUrn } from './parse-urn';

type TaskLinkInput = {
  id: string;
  subject?: string | null;
  subjectParent?: string | null;
  projectSlug?: string;
};

function taskLink({ id, subject, subjectParent, projectSlug }: TaskLinkInput): string {
  if (!projectSlug || !subject) return `/tasks/${id}`;
  const parsedSubject = parseUrn(subject);
  if (!parsedSubject) return `/tasks/${id}`;
  if (parsedSubject.type === 'manifest') {
    return `/explore/${projectSlug}/manifests/${parsedSubject.id}/annotate`;
  }
  if (parsedSubject.type === 'canvas' && subjectParent) {
    const parsedParent = parseUrn(subjectParent);
    if (parsedParent && parsedParent.type === 'manifest') {
      return `/explore/${projectSlug}/manifests/${parsedParent.id}/annotate`;
    }
  }
  return `/tasks/${id}`;
}

export function buildTaskLink(task: MadocCrowdsourcingTaskDto): string {
  return taskLink({ id: task.id, subject: task.subject, subjectParent: task.subject_parent, projectSlug: task.metadata?.project?.slug });
}

export function buildMyTaskLink(task: MyTaskDto): string {
  return taskLink({ id: task.id, subject: task.subject, subjectParent: task.subjectParent, projectSlug: task.project?.slug });
}
