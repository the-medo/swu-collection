import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
  CardVariant,
} from '../../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../../types/enums.ts';
import { setInfo } from '../../../../lib/swu-resources/set-info.ts';
import {
  getOfficialCardListData,
  getOfficialCardListVersion,
  setOfficialCardListData,
  setOfficialCardListVersion,
  getPreviewCardListData,
  getPreviewCardListVersion,
  setPreviewCardListData,
  setPreviewCardListVersion,
} from '@/dexie/cardList.ts';

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
      const [storedOfficialVersion, storedOfficialData, storedPreviewVersion, storedPreviewData] =
        await Promise.all([
          getOfficialCardListVersion(),
          getOfficialCardListData(),
          getPreviewCardListVersion(),
          getPreviewCardListData(),
        ]);

      let officialCards: CardList | undefined = storedOfficialData;
      let previewCards: CardList | undefined = storedPreviewData;
      let karabastUnimplemented: Record<string, true> = {};

      try {
        const response = await api.cards.$post({
          json: {
            officialLastUpdated: storedOfficialVersion || undefined,
            previewLastUpdated: storedPreviewVersion || undefined,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to check card list version');
        }

        const data = await response.json();
        karabastUnimplemented = data.karabast_unimplemented ?? {};

        if (data.official.needsUpdate) {
          if ('cards' in data.official && data.official.cards) {
            officialCards = data.official.cards as CardList;
            await setOfficialCardListData(officialCards);
            await setOfficialCardListVersion(data.official.lastUpdated);
          }
        }

        if (data.preview.needsUpdate) {
          if ('cards' in data.preview && data.preview.cards) {
            previewCards = data.preview.cards as CardList;
            await setPreviewCardListData(previewCards);
            await setPreviewCardListVersion(data.preview.lastUpdated);
          }
        }
      } catch (error) {
        // Fall through using whatever we loaded from IndexedDB above.
      }

      if (!officialCards) {
        throw new Error('Something went wrong');
      }

      // Merge: official cards win on collision so preview cards cannot shadow official data.
      const cardListData: CardList = { ...previewCards, ...officialCards };

      Object.keys(karabastUnimplemented).forEach(cardId => {
        const card = cardListData[cardId];
        if (card) {
          cardListData[cardId] = { ...card, karabast_unimplemented: true };
        }
      });

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

        if (card.type.includes('Token')) return;

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

          // Preview sets are validated on the server, but unreleased cards should still
          // be discoverable by card number before their official set sort window opens.
          if (card.preview) {
            if (validCardVariants[v.variantName]) {
              if (!cardsByCardNo[v.set]) cardsByCardNo[v.set] = {};
              cardsByCardNo[v.set]![v.cardNo] = { variant: v, cardId: cid };
            }
            return;
          }

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
        allTraits: new Set([...allTraits].sort((a, b) => a.localeCompare(b))),
        allKeywords: new Set([...allKeywords].sort((a, b) => a.localeCompare(b))),
        allVariants: new Set([...allVariants].sort((a, b) => a.localeCompare(b))),
      };
    },
    staleTime: Infinity,
  });
};
