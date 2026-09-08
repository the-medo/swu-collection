import { describe, expect, test } from 'bun:test';
import { SwuSet } from '../../../../../../types/enums.ts';
import type { AnalysisDataItem } from './tournamentMetaLib.ts';
import {
  getLeaderSearchMatches,
  normalizeLeaderSearch,
  splitMetaPieData,
} from './tournamentMetaSearch.ts';

const analysisData: AnalysisDataItem[] = [
  { key: 'boba-fett--collecting-the-bounty|Command', count: 12 },
  { key: 'sabe--queen-s-decoy|Vigilance', count: 8 },
  { key: 'luke-skywalker--faithful-friend|Aggression', count: 4 },
];

const cards = {
  'boba-fett--collecting-the-bounty': {
    title: 'Boba Fett',
    subtitle: 'Collecting the Bounty',
    name: 'Boba Fett, Collecting the Bounty',
    set: SwuSet.JTL,
  },
  'sabe--queen-s-decoy': {
    title: 'Sabé',
    subtitle: "Queen's Decoy",
    name: "Sabé, Queen's Decoy",
    set: SwuSet.SEC,
  },
};

describe('Meta Analysis leader search', () => {
  test('matches human-readable leader metadata on Leaders & Bases', () => {
    expect(getLeaderSearchMatches(analysisData, 'leadersAndBase', cards, 'collecting')).toEqual(
      new Set([analysisData[0].key]),
    );
  });

  test('matches names without requiring accents', () => {
    expect(getLeaderSearchMatches(analysisData, 'leadersAndBase', cards, 'sabe')).toEqual(
      new Set([analysisData[1].key]),
    );
    expect(getLeaderSearchMatches(analysisData, 'leadersAndBase', cards, 'queen s decoy')).toEqual(
      new Set([analysisData[1].key]),
    );
  });

  test('falls back to searchable card keys when card metadata is unavailable', () => {
    expect(getLeaderSearchMatches(analysisData, 'leadersAndBase', cards, 'luke skywalker')).toEqual(
      new Set([analysisData[2].key]),
    );
  });

  test('does not activate for unrelated Meta Analysis views', () => {
    expect(getLeaderSearchMatches(analysisData, 'bases', cards, 'boba')).toEqual(new Set());
    expect(normalizeLeaderSearch('   ')).toBe('');
  });

  test('promotes matching entries out of the pie chart Others group', () => {
    const highlightedKeys = new Set([analysisData[2].key]);
    const result = splitMetaPieData(analysisData, highlightedKeys, true, 2);

    expect(result.visibleItems.map(item => item.key)).toEqual(analysisData.map(item => item.key));
    expect(result.aggregatedItems).toEqual([]);
  });

  test('preserves the standard pie chart grouping when highlighting is inactive', () => {
    const result = splitMetaPieData(analysisData, new Set(), false, 2);

    expect(result.visibleItems).toEqual(analysisData.slice(0, 2));
    expect(result.aggregatedItems).toEqual(analysisData.slice(2));
  });
});
