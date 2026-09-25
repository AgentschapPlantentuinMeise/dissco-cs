import { InternationalString } from './madoc-project.js';

// A manifest-task stuck on "max contributors" whose underlying claims are all already -1 —
// nothing to release, just a stale counter that needs resyncing.
export type StuckManifestCounter = {
  id: string;
  name?: string;
  subject: string;
  modified_at: number;
  maxContributors: number;
  validCount: number;
  metadata?: {
    project?: { id: number; slug: string; label?: InternationalString | string };
  };
};
