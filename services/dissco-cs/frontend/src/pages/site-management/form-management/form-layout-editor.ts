import {
  FormLayoutFieldDto,
  FormLayoutItem,
  FormLayoutRow,
  MAX_FIELDS_PER_ROW,
  MadocAnnotationDocumentDto,
  MadocModelFields,
  SITE_PAGE_LANGS,
  SitePageLang,
} from '@dissco-cs/shared-types';

// The edits the layout editor makes, as pure functions on the layout's items. A field is moved by
// its term; a row that loses its last field disappears.

// Where a row sits: a loose row at `index` in the layout's items (section null), or row `index` of
// the section at items[section].
export type RowPlace = { section: number | null; index: number };

// Where a dragged field can be dropped: between rows (a new row), on a row (join it), or back on the
// list of fields that are not placed.
export type DropTarget = { kind: 'gap'; place: RowPlace } | { kind: 'row'; place: RowPlace } | { kind: 'unplaced' };

/** The id of a drop target, as dnd-kit needs one string per droppable. */
export function dropId(target: DropTarget): string {
  return target.kind === 'unplaced' ? 'unplaced' : `${target.kind}:${target.place.section ?? 'loose'}:${target.place.index}`;
}

export function parseDropId(id: string): DropTarget | null {
  if (id === 'unplaced') return { kind: 'unplaced' };
  const [kind, section, index] = id.split(':');
  if ((kind !== 'gap' && kind !== 'row') || index === undefined) return null;
  return { kind, place: { section: section === 'loose' ? null : Number(section), index: Number(index) } };
}

/** Applies a drop of the field `term` on `target`. */
export function dropTerm(items: FormLayoutItem[], term: string, target: DropTarget, fields: FormLayoutFieldDto[]): FormLayoutItem[] {
  if (target.kind === 'unplaced') return unplace(items, term);
  if (target.kind === 'gap') return placeAsNewRow(items, term, target.place);
  return placeInRow(items, term, target.place, fields);
}

const withoutTerm =(items: FormLayoutItem[], term: string): FormLayoutItem[] =>
  items.map(item =>
    item.kind === 'row'
      ? { ...item, terms: item.terms.filter(t => t !== term) }
      : { ...item, rows: item.rows.map(row => ({ ...row, terms: row.terms.filter(t => t !== term) })) }
  );

const dropEmptyRows = (items: FormLayoutItem[]): FormLayoutItem[] =>
  items
    .filter(item => item.kind === 'section' || item.terms.length > 0)
    .map(item => (item.kind === 'section' ? { ...item, rows: item.rows.filter(row => row.terms.length > 0) } : item));

export function rowAt(items: FormLayoutItem[], place: RowPlace): FormLayoutRow | undefined {
  if (place.section === null) {
    const item = items[place.index];
    return item?.kind === 'row' ? item : undefined;
  }
  const section = items[place.section];
  return section?.kind === 'section' ? section.rows[place.index] : undefined;
}

function updateRows(items: FormLayoutItem[], section: number, update: (rows: FormLayoutRow[]) => FormLayoutRow[]): FormLayoutItem[] {
  return items.map((item, i) => (i === section && item.kind === 'section' ? { ...item, rows: update(item.rows) } : item));
}

/** Puts a field on a new row of its own, before the row at `place` (or at the end when index is past the last). */
export function placeAsNewRow(items: FormLayoutItem[], term: string, place: RowPlace): FormLayoutItem[] {
  const row: FormLayoutRow = { kind: 'row', terms: [term] };
  const insert = <T,>(list: T[], value: T) => [...list.slice(0, place.index), value, ...list.slice(place.index)];
  const cleared = withoutTerm(items, term);
  const placed = place.section === null ? insert<FormLayoutItem>(cleared, row) : updateRows(cleared, place.section, rows => insert(rows, row));
  return dropEmptyRows(placed);
}

/**
 * Whether a field may join the row at `place`: the row has room (MAX_FIELDS_PER_ROW), and neither
 * the field nor the row is a group of fields (an entity), which always has a row of its own.
 */
export function canJoinRow(items: FormLayoutItem[], term: string, place: RowPlace, fields: FormLayoutFieldDto[]): boolean {
  const row = rowAt(items, place);
  if (!row || row.terms.includes(term) || row.terms.length >= MAX_FIELDS_PER_ROW) return false;
  const isEntity = (t: string) => fields.find(field => field.term === t)?.isEntity ?? false;
  return !isEntity(term) && !row.terms.some(isEntity);
}

/** Adds a field at the end of the row at `place`; the layout stays as it was when it may not join. */
export function placeInRow(items: FormLayoutItem[], term: string, place: RowPlace, fields: FormLayoutFieldDto[]): FormLayoutItem[] {
  if (!canJoinRow(items, term, place, fields)) return items;
  const join = (row: FormLayoutRow) => ({ ...row, terms: [...row.terms, term] });
  // withoutTerm keeps every row in place (an emptied one is dropped only at the end), so `place`
  // still points at the same row.
  const cleared = withoutTerm(items, term);
  const joined =
    place.section === null
      ? cleared.map((item, i) => (i === place.index && item.kind === 'row' ? join(item) : item))
      : updateRows(cleared, place.section, rows => rows.map((row, i) => (i === place.index ? join(row) : row)));
  return dropEmptyRows(joined);
}

/** Takes a field out of the layout; on the form it then appears after the placed fields. */
export function unplace(items: FormLayoutItem[], term: string): FormLayoutItem[] {
  return dropEmptyRows(withoutTerm(items, term));
}

export function addSection(items: FormLayoutItem[]): FormLayoutItem[] {
  return [...items, { kind: 'section', title: {}, rows: [] }];
}

/** Removes a section; its rows stay in the layout as loose rows at the same place, so no field is lost. */
export function removeSection(items: FormLayoutItem[], index: number): FormLayoutItem[] {
  return items.flatMap((item, i) => (i === index && item.kind === 'section' ? item.rows : [item]));
}

/** Moves a loose row or a section one place up (-1) or down (+1). */
export function moveItem(items: FormLayoutItem[], index: number, delta: -1 | 1): FormLayoutItem[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function setSectionTitle(items: FormLayoutItem[], index: number, lang: SitePageLang, text: string): FormLayoutItem[] {
  return items.map((item, i) => (i === index && item.kind === 'section' ? { ...item, title: { ...item.title, [lang]: text } } : item));
}

export function placedTerms(items: FormLayoutItem[]): Set<string> {
  return new Set(items.flatMap(item => (item.kind === 'row' ? item.terms : item.rows.flatMap(row => row.terms))));
}

/** The languages in which at least one section still has no title. */
export function missingTitleLangs(items: FormLayoutItem[]): SitePageLang[] {
  const sections = items.filter(item => item.kind === 'section');
  return SITE_PAGE_LANGS.filter(lang => sections.some(section => !(section.title[lang] ?? '').trim()));
}

// The form the preview shows: the model's fields in their own order, each as an empty field (a
// group of fields as an empty frame), so the real form components can draw them.
export function previewModel(fields: FormLayoutFieldDto[]): { fields: MadocModelFields; document: MadocAnnotationDocumentDto } {
  const properties: MadocAnnotationDocumentDto['properties'] = Object.fromEntries(
    fields.map(field => [
      field.term,
      field.isEntity
        ? [{ id: field.term, type: 'entity' as const, label: field.label, required: field.required, properties: {} }]
        : [{ id: field.term, type: field.type, label: field.label, required: field.required, value: '' }],
    ])
  );
  return {
    fields: fields.map(field => (field.isEntity ? [field.term, []] : field.term)),
    document: { id: 'preview', type: 'entity', properties },
  };
}
