import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useMemo, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { sortCardsByCardAspects } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import { Button } from '@/components/ui/button.tsx';
import { Crown } from 'lucide-react';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { createFakeCollectionCard } from '../../../../../../types/CollectionCard.ts';

type LeaderSelectorProps = Pick<DialogProps, 'trigger'> & {
  leaderCardId?: string;
  onLeaderSelected: (leaderCardId: string | undefined) => void;
};

const LeaderSelector: React.FC<LeaderSelectorProps> = ({
  trigger,
  leaderCardId,
  onLeaderSelected,
}) => {
  const [localLeaderCardId, setLocalLeaderCardId] = useState<string | undefined>(leaderCardId);
  const [open, setOpen] = useState(false);
  const { data: cardList } = useCardList();

  const leaderSorter = useMemo(
    () =>
      cardList ? sortCardsByCardAspects(cardList.cards, [CollectionSortBy.CARD_NAME]) : undefined,
    [cardList],
  );

  const leaders = useMemo(
    () =>
      Object.values(cardList?.cardsByCardType['Leader'] ?? {})
        .filter(Boolean)
        .map(l => {
          const variantId = selectDefaultVariant(l!) ?? '';
          return {
            card: l,
            variantId,
            fakeCollectionCardForSorting: createFakeCollectionCard(l!.cardId, variantId),
          };
        })
        .sort((a, b) => {
          if (!leaderSorter) return 0;
          return leaderSorter(a.fakeCollectionCardForSorting, b.fakeCollectionCardForSorting);
        }),
    [cardList],
  );

  const selectedLeader = useMemo(() => {
    return leaders.find(leader => leader?.card?.cardId === leaderCardId);
  }, [leaderCardId]);

  const localSelectedLeader = useMemo(() => {
    return leaders.find(leader => leader?.card?.cardId === localLeaderCardId);
  }, [localLeaderCardId]);

  const localTrigger = useMemo(() => {
    if (!selectedLeader) {
      return (
        <div className="cursor-pointer">
          <CardImage forceHorizontal size="w200">
            <h6 className="flex gap-2">
              <Crown /> Leader
            </h6>
          </CardImage>
        </div>
      );
    }
    return (
      <div className="cursor-pointer">
        <CardImage
          card={selectedLeader.card}
          cardVariantId={selectedLeader.variantId}
          forceHorizontal={true}
        />
      </div>
    );
  }, [selectedLeader]);

  const headerDescription = useMemo(() => {
    return 'Here will be some filters and stuff';
  }, []);

  const footer = useMemo(() => {
    return (
      <div className="flex flex-wrap gap-2 w-full justify-between items-center">
        <div className="flex flex-wrap gap-2 items-center">
          <CardImage
            card={localSelectedLeader?.card}
            cardVariantId={localSelectedLeader?.variantId}
            forceHorizontal={true}
            size="w100"
            backSideButton={false}
          />

          {localSelectedLeader ? (
            <>
              <h4>{localSelectedLeader?.card?.name} </h4>
              <Button onClick={() => setLocalLeaderCardId(undefined)} variant="outline">
                Clear
              </Button>
            </>
          ) : (
            <h4>No selected leader</h4>
          )}
        </div>
        <Button
          onClick={() => {
            onLeaderSelected(localSelectedLeader?.card?.cardId);
            setOpen(false);
          }}
        >
          Save
        </Button>
      </div>
    );
  }, [onLeaderSelected, localSelectedLeader]);

  return (
    <Dialog
      trigger={trigger ?? localTrigger}
      header={`Select leader`}
      headerDescription={headerDescription}
      footer={footer}
      open={open}
      onOpenChange={setOpen}
      contentClassName={`md:max-w-[90%]`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {leaders.map(leader => (
            <div
              className="cursor-pointer"
              onClick={() => setLocalLeaderCardId(leader?.card?.cardId)}
              key={leader?.card?.cardId}
            >
              <CardImage
                key={leader?.card?.cardId}
                card={leader.card}
                cardVariantId={leader.variantId}
                forceHorizontal={true}
                size="w300"
              />
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
};

export default LeaderSelector;
