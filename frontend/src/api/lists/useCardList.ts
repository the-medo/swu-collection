import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
  CardVariant,
} from '../../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../../types/enums.ts';
import { setInfo } from '../../../../lib/swu-resources/set-info.ts';

const STORAGE_KEY = 'swubase-card-list';
const VERSION_KEY = 'swubase-card-list-version';

export type CardsBySetAndNumber = Partial<
  Record<SwuSet, Record<number, { variant: CardVariant; cardId: string }> | undefined>
>;
export type CardsByCardType = Partial<
  Record<string, Record<string, CardDataWithVariants<CardListVariants> | undefined> | undefined>
>;

export type CardListResponse = {
  cards: CardList;
  cardIds: string[];
  cardsByCardNo: CardsBySetAndNumber;
  cardsByCardType: CardsByCardType;
  allTraits: Set<string>;
  allKeywords: Set<string>;
  allVariants: Set<string>;
};

export const useCardList = (): UseQueryResult<CardListResponse> => {
  return useQuery({
    queryKey: ['cardList'],
    queryFn: async () => {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const storedData = localStorage.getItem(STORAGE_KEY);

      let cardListData: CardList | undefined = undefined;

      try {
        const versionResponse = await api.cards.$post({
          json: { lastUpdated: storedVersion || undefined },
        });

        if (!versionResponse.ok) {
          throw new Error('Failed to check version');
        }

        const versionData = await versionResponse.json();
        if (versionData.needsUpdate) {
          if ('cards' in versionData) cardListData = versionData.cards as CardList;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cardListData));
          localStorage.setItem(VERSION_KEY, versionData.lastUpdated);
        } else if (storedData) {
          cardListData = JSON.parse(storedData);
        }
      } catch (error) {
        if (storedData) {
          cardListData = JSON.parse(storedData);
        }
      }

      if (!cardListData) {
        throw new Error('Something went wrong');
      }

      const cardIds = Object.keys(cardListData).sort((a, b) => a.localeCompare(b));
      const cardsByCardNo: CardsBySetAndNumber = {};
      const cardsByCardType: CardsByCardType = {};
      const allTraits = new Set<string>();
      const allKeywords = new Set<string>();
      const allVariants = new Set<string>();

      cardIds.forEach(cid => {
        const card = cardListData[cid];
        if (!card) return;
        const variantIds = Object.keys(card.variants ?? {});
        const type = card?.type ?? 'Unknown';

        if (card.traits) {
          if (!card.traitMap) card.traitMap = {};
          card.traits.forEach(trait => {
            allTraits.add(trait);
            card.traitMap![trait] = true;
          });
        }

        if (card.keywords) {
          if (!card.keywordMap) card.keywordMap = {};
          card.keywords.forEach(kw => {
            allKeywords.add(kw);
            card.keywordMap![kw] = true;
          });
        }

        if (card.arenas) {
          if (!card.arenaMap) card.arenaMap = {};
          card.arenas.forEach(a => {
            card.arenaMap![a] = true;
          });
        }

        if (card.aspects) {
          if (!card.aspectMap) card.aspectMap = {};
          card.aspects.forEach(a => {
            if (card.aspectMap![a]) {
              card.aspectMap![a]++;
            } else {
              card.aspectMap![a] = 1;
            }
          });
        }

        if (!cardsByCardType[type]) cardsByCardType[type] = {};
        cardsByCardType[type][cid] = card;

        const validCardVariants: Record<string, true | undefined> = {
          Standard: true,
          'Standard Foil': true,
          Hyperspace: true,
          'Hyperspace Foil': true,
          Showcase: true,
          'Standard Prestige': true,
          'Foil Prestige': true,
          'Serialized Prestige': true,
        };

        if (!card.variantMap) card.variantMap = {};
        variantIds.forEach(vid => {
          const v = card?.variants[vid];
          if (!v) return;
          card.variantMap![v.variantName] = vid;
          allVariants.add(v.variantName);
          if (
            v &&
            (v.baseSet || setInfo[v.set].sortValue >= setInfo[SwuSet.JTL].sortValue) &&
            validCardVariants[v.variantName]
          ) {
            if (!cardsByCardNo[v.set]) cardsByCardNo[v.set] = {};
            cardsByCardNo[v.set]![v.cardNo] = {
              variant: v,
              cardId: cid,
            };
          }
        });
      });

      return {
        cards: cardListData,
        cardIds,
        cardsByCardNo,
        cardsByCardType,
        allTraits: [...allTraits].sort((a, b) => a.localeCompare(b)),
        allKeywords: [...allKeywords].sort((a, b) => a.localeCompare(b)),
        allVariants: [...allVariants].sort((a, b) => a.localeCompare(b)),
      };
    },
    staleTime: Infinity,
  });
};
