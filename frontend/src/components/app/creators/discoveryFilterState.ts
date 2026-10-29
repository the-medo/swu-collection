import { creationTagMap, normalizeTagIds } from '../../../../../shared/creators/taxonomy.ts';
import { languageInfo } from '../../../../../shared/creators/languages.ts';
import type { DiscoveryQuery, DiscoveryResult } from '../../../../../shared/creators/contracts.ts';

export function getDiscoveryFilters(search: DiscoveryQuery, data?: DiscoveryResult) {
  const tags = normalizeTagIds(search.tags?.split(',').filter(Boolean) ?? []);
  const filters: { id: string; label: string; remove: Partial<DiscoveryQuery> }[] = tags.map(
    tag => ({
      id: tag,
      label: creationTagMap.get(tag)?.label ?? tag,
      remove: { tags: tags.filter(value => value !== tag).join(',') || undefined },
    }),
  );
  if (search.q)
    filters.unshift({ id: 'q', label: `Search: ${search.q}`, remove: { q: undefined } });
  if (search.following)
    filters.push({ id: 'following', label: 'Following', remove: { following: undefined } });
  if (search.language)
    filters.push({
      id: 'language',
      label: languageInfo(search.language).label,
      remove: { language: undefined },
    });
  if (search.freshness)
    filters.push({
      id: 'freshness',
      label: search.freshness === 'current' ? 'Current' : 'Historical',
      remove: { freshness: undefined },
    });
  if (search.after)
    filters.push({ id: 'after', label: `Since ${search.after}`, remove: { after: undefined } });
  if (search.before)
    filters.push({
      id: 'before',
      label: `Through ${search.before}`,
      remove: { before: undefined },
    });
  if (search.entityId && search.entityType)
    filters.push({
      id: 'subject',
      label:
        data?.subject?.id === search.entityId
          ? data.subject.label
          : `Selected ${search.entityType}`,
      remove: { entityId: undefined, entityType: undefined },
    });
  if (search.creatorId)
    filters.push({
      id: 'creator',
      label:
        data?.items.find(item => item.creatorId === search.creatorId)?.creator?.name ??
        'Selected creator',
      remove: { creatorId: undefined },
    });
  if (search.series)
    filters.push({
      id: 'series',
      label: `Series: ${search.series}`,
      remove: { series: undefined },
    });
  return filters;
}
