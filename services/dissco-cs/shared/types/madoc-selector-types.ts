// Plain data shape copied from madoc-ts's MadocBaseSelectorDto (services/madoc-ts/src/frontend/shared/capture-models/types/selector-types.ts).
// Only the wire-format data shape is copied here, not madoc-ts's React-component plumbing.
export type MadocBaseSelectorDto = {
  id: string;
  type: string;
  state: any;
  revisionId?: string | null;
  revises?: string | null;
};

export type MadocBoxSelectorState = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;
