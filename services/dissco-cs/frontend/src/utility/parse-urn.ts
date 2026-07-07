const urnRegex = /urn:madoc:(collection|manifest|canvas|user|site|project):([0-9]+)/;

export function parseUrn<T extends { type: string; id: number }>(urn: string) {
  const [, type, id] = urn.match(urnRegex) || [];

  if (type && id) {
    return { id: Number(id), type: `${type}` } as T;
  }

  return undefined;
}
