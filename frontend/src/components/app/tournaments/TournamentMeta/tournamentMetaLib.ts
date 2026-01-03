import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import { TournamentData } from '../../../../../../types/Tournament.ts';
import { MetaPart } from '@/components/app/tournaments/TournamentMeta/MetaPartSelector.tsx';
import { getBaseKey } from '@/components/app/tournaments/TournamentMatchups/utils/getBaseKey.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { CardListResponse } from '@/api/lists/useCardList.ts';

export interface TournamentDeckKey {
  key?: string;
  metaInfo?: MetaInfo;
}

export type TournamentInfoMap = Record<string, TournamentData>;

export type TournamentAnalyzerData = {
  decks: TournamentDeckResponse[];
  matches: TournamentMatch[];
  info: TournamentInfoMap;
};

export type TournamentDataMap = Record<string, TournamentAnalyzerData | undefined>;

export interface AnalysisDataItem {
  key: string;
  count: number;
  wins?: number;
  losses?: number;
  winrate?: number;
  data?: {
    all: number;
    top8: number;
    day2: number;
    top64: number;
    champions: number;
    conversionTop8: string;
    conversionDay2: string;
    conversionTop64: string;
    conversionChampions: string;
  };
  percentage?: number;
}

export const getTotalDeckCountBasedOnMetaPart = (
  metaPart: MetaPart | string,
  totalDecks: number,
  day2Decks: number,
  top8Decks: number,
  top64Decks: number,
  championsDecks: number,
) => {
  switch (metaPart) {
    case 'all':
      return totalDecks;
    case 'day2':
      return day2Decks;
    case 'top8':
      return top8Decks;
    case 'top64':
      return top64Decks;
    case 'champions':
      return championsDecks;
  }
  return 0;
};

export const getDeckLeadersAndBaseKey = (
  deck: TournamentDeckResponse['deck'] | null,
  cardListData: CardListResponse | undefined,
) => {
  if (!deck || !cardListData) return '';
  // Use leader card IDs and base card ID as key
  const leaderKey = [deck.leaderCardId1, deck.leaderCardId2].filter(Boolean).sort().join('-');
  const baseKeyValue = getBaseKey(deck.baseCardId);
  return `${leaderKey}|${baseKeyValue}`;
};

export const getDeckLeadersAndBaseKey2 = (
  leaderCardId: string | undefined,
  baseCardId: string | undefined,
  cardListData: CardListResponse | undefined,
) => {
  if (!cardListData) return '';
  const leaderKey = leaderCardId;
  const baseKeyValue = getBaseKey(baseCardId);
  return `${leaderKey}|${baseKeyValue}`;
};

export const getDeckKeys = (
  deck: TournamentDeckResponse,
  metaInfo: MetaInfo,
  cardListData: CardListResponse | undefined,
) => {
  if (!deck.deck || !cardListData) return [''];
  if (!deck.deck.leaderCardId1 || !deck.deck.baseCardId) return ['unknown'];

  let key = '';

  switch (metaInfo) {
    case 'leaders':
      // Use leader card IDs as key
      key = [deck.deck.leaderCardId1, deck.deck.leaderCardId2].filter(Boolean).sort().join('-');
      break;
    case 'leadersAndBase':
      key = getDeckLeadersAndBaseKey(deck.deck, cardListData);
      break;
    case 'bases':
      key = getBaseKey(deck.deck.baseCardId);
      break;
    case 'aspectsBase':
      // Use base aspect as key
      if (deck.deckInformation?.baseAspect) {
        key = deck.deckInformation.baseAspect;
      } else {
        key = 'no-aspect';
      }
      break;
    case 'aspects':
    case 'aspectsDetailed':
      // Create a key based on which aspects are used
      const aspects: string[] = [];
      if (deck.deckInformation?.aspectCommand)
        Array.from({ length: deck.deckInformation?.aspectCommand }).forEach(() =>
          aspects.push('Command'),
        );
      if (deck.deckInformation?.aspectVigilance)
        Array.from({ length: deck.deckInformation?.aspectVigilance }).forEach(() =>
          aspects.push('Vigilance'),
        );
      if (deck.deckInformation?.aspectAggression)
        Array.from({ length: deck.deckInformation?.aspectAggression }).forEach(() =>
          aspects.push('Aggression'),
        );
      if (deck.deckInformation?.aspectCunning)
        Array.from({ length: deck.deckInformation?.aspectCunning }).forEach(() =>
          aspects.push('Cunning'),
        );
      if (deck.deckInformation?.aspectHeroism)
        Array.from({ length: deck.deckInformation?.aspectHeroism }).forEach(() =>
          aspects.push('Heroism'),
        );
      if (deck.deckInformation?.aspectVillainy)
        Array.from({ length: deck.deckInformation?.aspectVillainy }).forEach(() =>
          aspects.push('Villainy'),
        );
      if (metaInfo === 'aspects') return aspects;
      key = aspects.sort().join('-') || 'no-aspect';
      break;
    case 'sets':
      key = cardListData?.cards[deck.deck.leaderCardId1]?.set || 'unknown';
      break;
  }
  return [key];
};

export const getDeckKey2 = (
  leaderCardId: string | undefined,
  baseCardId: string | undefined,
  metaInfo: MetaInfo,
  cardListData: CardListResponse | undefined,
) => {
  if (!cardListData) return '';
  if (!leaderCardId || !baseCardId) {
    return 'unknown';
  }

  const leaderCard = leaderCardId ? cardListData?.cards[leaderCardId] : undefined;
  const baseCard = baseCardId ? cardListData?.cards[baseCardId] : undefined;

  let key = '';

  switch (metaInfo) {
    case 'leaders':
      // Use leader card IDs as key
      key = leaderCardId;
      break;
    case 'leadersAndBase':
      key = getDeckLeadersAndBaseKey2(leaderCardId, baseCardId, cardListData);
      break;
    case 'bases':
      key = getBaseKey(baseCardId);
      break;
    case 'aspectsBase':
      // Use base aspect as key
      if (baseCard) {
        key = baseCard?.aspects[0] || 'no-aspect';
      } else {
        key = 'no-aspect';
      }
      break;
    case 'aspects':
    case 'aspectsDetailed':
      // Create a key based on which aspects are used
      const aspects: string[] = [];
      leaderCard?.aspects.forEach(a => aspects.push(a));
      baseCard?.aspects.forEach(a => aspects.push(a));

      if (metaInfo === 'aspects') {
        // For 'aspects', we'll just use the first aspect as the key
        key = aspects[0] || 'no-aspect';
      } else {
        key = aspects.sort().join('-') || 'no-aspect';
      }
      break;
    case 'sets':
      key = leaderCard?.set || 'unknown';
      break;
  }

  return key;
};

export const labelWidthBasedOnMetaInfo: Record<MetaInfo, number> = {
  ['leaders']: 180,
  ['leadersAndBase']: 220,
  ['bases']: 180,
  ['aspects']: 70,
  ['aspectsBase']: 70,
  ['aspectsDetailed']: 180,
  ['sets']: 150,
};
