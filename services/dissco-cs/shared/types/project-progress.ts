export type ProjectProgress = {
  transcribedPercentage: number;
  totalTasks: number;
  allTasksTaken: boolean;
  availableManifests: Array<{ id: number; label: unknown; thumbnail?: string }>;
};
