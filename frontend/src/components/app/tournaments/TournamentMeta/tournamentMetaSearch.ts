import type { MetaInfo } from './MetaInfoSelector.tsx';
import type { AnalysisDataItem } from './tournamentMetaLib.ts';
import type { CardDataWithVariants } from '../../../../../../lib/swu-resources/types.ts';

type SearchableLeaderCard = Pick<
  CardDataWithVariants,
  'name' | 'set' | 'subtitle' | 'title'
>;

type SearchableLeaderCardMap = Record<string, SearchableLeaderCard | undefined>;

export const supportsLeaderSearch = (metaInfo: MetaInfo) =>
  metaInfo === 'leaders' || metaInfo === 'leadersAndBase';

export const normalizeLeaderSearch = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const getLeaderSearchMatches = (
  analysisData: readonly AnalysisDataItem[],
  metaInfo: MetaInfo,
  cards: SearchableLeaderCardMap,
  search: string,
) => {
  const normalizedSearch = normalizeLeaderSearch(search);
  const matches = new Set<string>();

  if (!normalizedSearch || !supportsLeaderSearch(metaInfo)) return matches;

  analysisData.forEach(item => {
    const leaderKey = metaInfo === 'leadersAndBase' ? item.key.split('|')[0] : item.key;
    const leaderCard = cards[leaderKey];
    const searchableText = normalizeLeaderSearch(
      [
        leaderCard?.title,
        leaderCard?.subtitle,
        leaderCard?.name,
        leaderCard?.set,
        leaderKey.replaceAll('-', ' '),
      ]
        .filter(Boolean)
        .join(' '),
    );

    if (searchableText.includes(normalizedSearch)) matches.add(item.key);
  });

  return matches;
};

export const splitMetaPieData = (
  analysisData: readonly AnalysisDataItem[],
  highlightedKeys: ReadonlySet<string>,
  isHighlighting: boolean,
  visibleItemLimit = 20,
) => {
  const visibleItems = analysisData.slice(0, visibleItemLimit);
  const normallyAggregatedItems = analysisData.slice(visibleItemLimit);

  if (!isHighlighting) {
    return { visibleItems, aggregatedItems: normallyAggregatedItems };
  }

  const promotedItems: AnalysisDataItem[] = [];
  const aggregatedItems: AnalysisDataItem[] = [];

  normallyAggregatedItems.forEach(item => {
    if (highlightedKeys.has(item.key)) {
      promotedItems.push(item);
    } else {
      aggregatedItems.push(item);
    }
  });

  return {
    visibleItems: [...visibleItems, ...promotedItems],
    aggregatedItems,
  };
};
