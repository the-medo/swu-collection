import { creationTagMap, normalizeTagIds } from '../../../shared/creators/taxonomy.ts';
import { uniqueLanguageCodes } from '../../../shared/creators/languages.ts';
import { CreatorError } from './errors.ts';
export const escapedSearch = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

export function groupDiscoveryTags(tags = '') {
  const groups = new Map<string, string[]>();
  for (const id of normalizeTagIds(tags.split(',').filter(Boolean))) {
    const tag = creationTagMap.get(id);
    if (!tag) throw new CreatorError('Unknown discovery classification.');
    groups.set(tag.dimension, [...(groups.get(tag.dimension) ?? []), id]);
  }
  return [...groups.values()];
}

export function availableLanguages(rows: { language: string }[]) {
  return uniqueLanguageCodes(rows.map(({ language }) => language)).sort();
}
