import React, { useMemo } from 'react';
import { useGetCardPool } from '@/api/card-pools/useGetCardPool.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '../useCardPoolDeckDetailStore.ts';
import { getBasicBaseIdsForSet } from '../../../../../../../shared/lib/basicBases.ts';
import { SwuSet } from '../../../../../../../types/enums.ts';
import { Button } from '@/components/ui/button.tsx';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import { useDeckLeaderAndBaseCards } from '@/hooks/useDeckLeaderAndBaseCards.ts';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';

export interface CPLeaderAndBaseProps {
  deckId?: string; // reserved for future use
  poolId?: string;
  className?: string;
}

const CPLeaderAndBase: React.FC<CPLeaderAndBaseProps> = ({ deckId, poolId, className }) => {
  const user = useUser();
  const { data: deckData } = useGetDeck(deckId);
  const owned = user && user?.id === deckData?.user?.id;

  const { data: poolData, isFetching: isPoolFetching } = useGetCardPool(poolId);
  const { data: cardListData, isFetching: isCardListFetching } = useCardList();
  const { deckLeaderId, deckBaseId, isDeckFetching } = useDeckLeaderAndBaseCards(deckId);
  const { selectedLeaderId, selectedBaseId } = useCardPoolDeckDetailStore();
  const { setHoveredCardId, setSelectedLeaderId, setSelectedBaseId, setLeadersAndBasesExpanded } =
    useCardPoolDeckDetailStoreActions();

  const leaderCards = useMemo(() => {
    const leaders = poolData?.data?.leaders ?? '';
    return leaders
      .split(',')
      .map((cardId, i) => {
        const card = cardListData?.cards[cardId];
        const cardVariantId = card ? selectDefaultVariant(card) : undefined;
        return { key: i, cardId, card, cardVariantId };
      })
      .filter(c => c.card);
  }, [poolData?.data?.leaders, cardListData?.cards]);

  const baseCards = useMemo(() => {
    const set = poolData?.data?.set as SwuSet | undefined;
    if (!set || !cardListData?.cards)
      return [] as { key: number; cardId: string; card: any; cardVariantId?: string }[];
    const ids = getBasicBaseIdsForSet(set, cardListData.cards, true);
    return ids
      .map((cardId, i) => {
        const card = cardListData.cards[cardId];
        const cardVariantId = card ? selectDefaultVariant(card) : undefined;
        return { key: i, cardId, card, cardVariantId };
      })
      .filter(c => c.card);
  }, [poolData?.data?.set, cardListData?.cards]);

  const loading = isPoolFetching || isCardListFetching;

  const hasChanges = !!(
    (selectedLeaderId && selectedLeaderId !== deckLeaderId) ||
    (selectedBaseId && selectedBaseId !== deckBaseId)
  );

  const putDeckMutation = usePutDeck(deckId);
  const onSave = () => {
    if (!deckId) return;
    const payload: { leaderCardId1?: string | null; baseCardId?: string | null; deckId?: string } =
      {
        deckId,
      };
    if (selectedLeaderId !== deckLeaderId && selectedLeaderId !== '') {
      payload.leaderCardId1 = selectedLeaderId || null;
    }
    if (selectedBaseId !== deckBaseId && selectedBaseId !== '') {
      payload.baseCardId = selectedBaseId || null;
    }
    // Avoid calling if nothing to update (safety)
    if (payload.leaderCardId1 === undefined && payload.baseCardId === undefined) return;
    putDeckMutation.mutate(payload);
    setLeadersAndBasesExpanded(false);
  };

  const { data: cardPreview } = useGetUserSetting('cpLayout_cardPreview');

  return (
    <div className={`rounded-lg border border-border bg-card p-2 ${className ?? ''}`}>
      {loading && <div className="text-xs opacity-60">Loading leaders...</div>}
      {!loading && leaderCards.length === 0 && (
        <div className="text-xs opacity-60">No leaders selected for this pool.</div>
      )}

      <div className="flex flex-row flex-wrap items-center gap-2">
        <div className="flex items-center justify-end">
          <Button size="sm" variant="ghost" onClick={() => setLeadersAndBasesExpanded(false)}>
            Collapse
          </Button>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-8">
          <div className="flex flex-row gap-2 items-start">
            {leaderCards.map(lc => (
              <DeckCardHoverImage
                key={`${lc.cardId}-${lc.key}`}
                card={lc.card}
                defaultVariantId={lc.cardVariantId}
                size="w300"
                active={cardPreview === 'hover'}
              >
                <div
                  onMouseEnter={() => setHoveredCardId(lc.cardId)}
                  onClick={() => setSelectedLeaderId(lc.cardId)}
                  className={`rounded-md ${lc.cardId === deckLeaderId ? 'ring-4 ring-black dark:ring-white' : selectedLeaderId === lc.cardId ? 'ring-8 ring-primary' : ''}`}
                >
                  <CardImage
                    card={lc.card}
                    cardVariantId={lc.cardVariantId}
                    forceHorizontal={true}
                    size="w100"
                    backSideButton="mid"
                  />
                </div>
              </DeckCardHoverImage>
            ))}
          </div>
          <div className="flex flex-row gap-2 items-start">
            {baseCards.map(bc => (
              <DeckCardHoverImage
                key={`${bc.cardId}-${bc.key}`}
                card={bc.card}
                size="w300"
                active={cardPreview === 'hover'}
              >
                <div
                  onMouseEnter={() => setHoveredCardId(bc.cardId)}
                  onClick={() => setSelectedBaseId(bc.cardId)}
                  className={`rounded-md ${bc.cardId === deckBaseId ? 'ring-4 ring-black dark:ring-white' : selectedBaseId === bc.cardId ? 'ring-8 ring-primary' : ''}`}
                >
                  <CardImage
                    card={bc.card}
                    cardVariantId={bc.cardVariantId}
                    forceHorizontal={true}
                    size="w100"
                    backSideButton="mid"
                  />
                </div>
              </DeckCardHoverImage>
            ))}
          </div>
        </div>

        {owned && (
          <div className="flex items-center justify-end mb-2">
            {!isDeckFetching && hasChanges && (
              <Button size="lg" onClick={onSave} disabled={putDeckMutation.isPending}>
                {putDeckMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CPLeaderAndBase;
