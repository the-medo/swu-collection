import { CardStatData } from '@/components/app/card-stats/types.ts';
import { SwuArena } from '../../../../../../types/enums.ts';
import { CardType, cardTypeSortValues } from '../../../../../../shared/types/cardTypes.ts';

/**
 * Filter card statistics data based on minimum deck count and search term
 */
export const filterCardStats = (
  data: CardStatData[],
  minDeckCount: number,
  cardSearch: string,
): CardStatData[] => {
  let result = [...data];

  // Apply minimum deck count filter
  if (minDeckCount > 0) {
    result = result.filter(item => item.cardStat.deckCount >= minDeckCount);
  }

  // Apply card search filter
  if (cardSearch) {
    // Convert search term according to the specified approach
    const processedSearchTerm = cardSearch.toLowerCase().replace(/[^a-z0-9]/g, '-');
    result = result.filter(item => {
      // Only search in card ID
      return item.cardStat.cardId.toLowerCase().includes(processedSearchTerm);
    });
  }

  return result;
};

/**
 * Sort card statistics data based on sort field
 */
export const sortCardStats = (data: CardStatData[], sortBy: string): CardStatData[] => {
  const result = [...data];

  result.sort((a, b) => {
    const statA = a.cardStat;
    const statB = b.cardStat;

    switch (sortBy) {
      case 'md':
        return statB.countMd - statA.countMd;
      case 'sb':
        return statB.countSb - statA.countSb;
      case 'total':
        return statB.countMd + statB.countSb - (statA.countMd + statA.countSb);
      case 'avgMd':
        const avgMdA = statA.deckCount > 0 ? statA.countMd / statA.deckCount : 0;
        const avgMdB = statB.deckCount > 0 ? statB.countMd / statB.deckCount : 0;
        return avgMdB - avgMdA;
      case 'avgTotal':
        const avgTotalA =
          statA.deckCount > 0 ? (statA.countMd + statA.countSb) / statA.deckCount : 0;
        const avgTotalB =
          statB.deckCount > 0 ? (statB.countMd + statB.countSb) / statB.deckCount : 0;
        return avgTotalB - avgTotalA;
      case 'deckCount':
        return statB.deckCount - statA.deckCount;
      case 'winRate':
        const totalMatchesA = statA.matchWin + statA.matchLose;
        const totalMatchesB = statB.matchWin + statB.matchLose;
        const winRateA = totalMatchesA > 0 ? statA.matchWin / totalMatchesA : 0;
        const winRateB = totalMatchesB > 0 ? statB.matchWin / totalMatchesB : 0;
        return winRateB - winRateA;
      default:
        return 0;
    }
  });

  return result;
};

/**
 * Group card statistics data based on group field
 */
export const groupCardStats = (
  data: CardStatData[],
  groupBy: string,
): Record<string, CardStatData[]> => {
  if (groupBy === 'none') {
    return { 'All Cards': data };
  }

  const groups: Record<string, CardStatData[]> = {};

  data.forEach(item => {
    let groupKey = 'Unknown';

    if (groupBy === 'type' && item.card) {
      const cardType = item.card.type || 'Unknown Type';

      // Split "Units" into "Ground units" and "Space units"
      if (cardType === 'Unit') {
        // Check if the card has the SPACE arena
        const isSpaceUnit =
          item.card.arenas.includes(SwuArena.SPACE) ||
          (item.card.arenaMap && item.card.arenaMap['Space']);

        groupKey = isSpaceUnit ? 'UnitSpace' : 'UnitGround';
      } else {
        groupKey = cardType;
      }
    } else if (groupBy === 'cost' && item.card) {
      groupKey = item.card.cost !== null ? `Cost ${item.card.cost}` : 'No Cost';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(item);
  });

  // If grouping by type, sort the groups by type using cardTypeSortValues
  if (groupBy === 'type') {
    const sortedGroups: Record<string, CardStatData[]> = {};

    // Sort keys by cardTypeSortValues
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const sortValueA = cardTypeSortValues[a as CardType] ?? 999; // Default to high value if not found
      const sortValueB = cardTypeSortValues[b as CardType] ?? 999;
      return sortValueA - sortValueB;
    });

    // Create a new object with sorted keys
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }

  // If grouping by cost, sort the groups by cost
  if (groupBy === 'cost') {
    const sortedGroups: Record<string, CardStatData[]> = {};

    // Extract cost values and sort them
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Handle "No Cost" specially
      if (a === 'No Cost') return -1;
      if (b === 'No Cost') return 1;

      // Extract numeric cost from the key (e.g., "Cost 3" -> 3)
      const costA = parseInt(a.replace('Cost ', ''), 10);
      const costB = parseInt(b.replace('Cost ', ''), 10);

      return costA - costB;
    });

    // Create a new object with sorted keys
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }

  return groups;
};

/**
 * Process card statistics data: filter, sort, and group
 */
export const processCardStats = (
  data: CardStatData[],
  options: {
    minDeckCount: number;
    cardSearch: string;
    sortBy: string;
    groupBy: string;
  },
): {
  filteredAndSortedData: CardStatData[];
  groupedData: Record<string, CardStatData[]>;
} => {
  const { minDeckCount, cardSearch, sortBy, groupBy } = options;

  // Filter data
  const filteredData = filterCardStats(data, minDeckCount, cardSearch);

  // Sort data
  const sortedData = sortCardStats(filteredData, sortBy);

  // Group data
  const groupedData = groupCardStats(sortedData, groupBy);

  return {
    filteredAndSortedData: sortedData,
    groupedData,
  };
};

/**
 * Get visible data for the current scroll position when not grouped
 */
export const getVisibleUngroupedData = (
  filteredAndSortedData: CardStatData[],
  itemsToShow: number,
): CardStatData[] => {
  return filteredAndSortedData.slice(0, itemsToShow);
};

/**
 * Get visible data for the current scroll position when grouped
 */
export const getVisibleGroupedData = (
  groupedData: Record<string, CardStatData[]>,
  itemsToShow: number,
): Record<string, CardStatData[]> => {
  const result: Record<string, CardStatData[]> = {};
  const itemsPerGroup = Math.max(3, Math.floor(itemsToShow / Object.keys(groupedData).length));

  Object.entries(groupedData).forEach(([key, items]) => {
    result[key] = items.slice(0, itemsPerGroup);
  });

  return result;
};
