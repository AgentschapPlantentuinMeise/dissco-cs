export interface ManifestTaskDetail {
  status: number;
  state?: { maxContributors?: number };
  subtasks?: Array<{ type: string; status: number }>;
}

/**
 * Whether a manifest task that Madoc still marks as full should accept volunteers again: it has a
 * maximum, is not open (1), done (3) or rejected (-1), and fewer claims than that maximum are
 * still active (crowdsourcing-task subtasks that were not abandoned).
 * @param detail the manifest task with its state and subtasks (getMadocTaskDetail)
 * Returns: true when it should be set back to status 1.
 */
export function shouldReopenManifest(detail: ManifestTaskDetail): boolean {
  const maximum = detail.state?.maxContributors ? Number(detail.state.maxContributors) : undefined;
  if (!maximum || detail.status === 3 || detail.status === -1 || detail.status === 1) {
    return false;
  }

  const validCount = (detail.subtasks ?? []).filter(t => t.type === 'crowdsourcing-task' && t.status !== -1).length;
  return validCount < maximum;
}
