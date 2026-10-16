import type { TemplateMeta, TemplateMetaEvent } from '../../../shared/types/ArticleTemplates.ts';

export type TemplateMetaRow = {
  id: string;
  name: string;
  leaderId: string | null;
  baseId: string | null;
  tournamentId: string;
  placement: number | null;
  hasDecklist: boolean;
};

export function summarizeTemplateMeta(
  source: TemplateMeta['source'],
  events: TemplateMetaEvent[],
  rows: TemplateMetaRow[],
  asOf: string,
): TemplateMeta {
  const groups = new Map<string, TemplateMeta['archetypes'][number]>();
  const eventNames = new Map(events.map(event => [event.id, event.name]));
  const uniqueRows = [...new Map(rows.map(row => [`${row.tournamentId}:${row.id}`, row])).values()];
  for (const row of uniqueRows) {
    if (!row.leaderId || !row.baseId) continue;
    const key = `${row.leaderId}|${row.baseId}`;
    const group = groups.get(key) ?? { key, leaderId: row.leaderId, baseId: row.baseId, count: 0 };
    group.count++;
    groups.set(key, group);
  }
  return {
    source,
    asOf,
    events,
    deckCount: uniqueRows.length,
    archetypes: [...groups.values()]
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, 30),
    decklists: uniqueRows
      .filter(
        (row): row is TemplateMetaRow & { placement: number } =>
          row.hasDecklist && row.placement !== null && row.placement > 0,
      )
      .sort(
        (a, b) =>
          a.placement - b.placement ||
          a.tournamentId.localeCompare(b.tournamentId) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, 12)
      .map(({ hasDecklist: _hasDecklist, ...row }) => ({
        ...row,
        tournamentName: eventNames.get(row.tournamentId) ?? 'Tournament',
      })),
  };
}
