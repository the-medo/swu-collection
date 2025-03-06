import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage, { CardImageVariantProps } from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { sortCardsByCardAspects } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import { Button } from '@/components/ui/button.tsx';
import { Crown, Search } from 'lucide-react';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { createFakeCollectionCard } from '../../../../../../types/CollectionCard.ts';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter.tsx';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { aspectArray } from '../../../../../../types/iterableEnumInfo.ts';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { Input } from '@/components/ui/input.tsx';
import { cn } from '@/lib/utils.ts';

type LeaderSelectorProps = Pick<DialogProps, 'trigger'> & {
  leaderCardId?: string;
  onLeaderSelected?: (leaderCardId: string | undefined) => void;
  editable?: boolean;
  size?: CardImageVariantProps['size'];
};

const LeaderSelector: React.FC<LeaderSelectorProps> = ({
  trigger,
  leaderCardId,
  onLeaderSelected,
  editable = true,
  size = 'w200',
}) => {
  const [open, setOpen] = useState(false);
  const [localLeaderCardId, setLocalLeaderCardId] = useState<string | undefined>(leaderCardId);
  const [search, setSearch] = useState<string>('');
  const [aspectFilter, setAspectFilter] = useState<SwuAspect[]>(aspectArray);
  const { data: cardList } = useCardList();

  const leaderSorter = useMemo(
    () =>
      cardList ? sortCardsByCardAspects(cardList.cards, [CollectionSortBy.CARD_NAME]) : undefined,
    [cardList],
  );

  const transformedAspectsForFilter = useMemo(() => {
    const transformedAspects: Partial<Record<SwuAspect, true | undefined>> = {};
    aspectFilter.forEach(aspect => {
      transformedAspects[aspect] = true;
    });
    return transformedAspects;
  }, [aspectFilter]);

  const filteringByAspects = useCallback(
    (card: CardDataWithVariants<CardListVariants> | undefined) => {
      const notFoundAspects = (card?.aspects ?? []).filter(a => !transformedAspectsForFilter[a]);
      let notFoundAspect: SwuAspect | undefined = notFoundAspects?.[0];

      // Filter rule for Heroism + Villainy leaders (Chancellor Palpatine)
      if (
        notFoundAspects.length === 1 &&
        ((notFoundAspect === SwuAspect.HEROISM && card?.aspects.includes(SwuAspect.VILLAINY)) ||
          (notFoundAspect === SwuAspect.VILLAINY && card?.aspects.includes(SwuAspect.HEROISM)))
      ) {
        notFoundAspect = undefined;
      }

      return notFoundAspect === undefined;
    },
    [transformedAspectsForFilter],
  );

  const leaders = useMemo(
    () =>
      Object.values(cardList?.cardsByCardType['Leader'] ?? {})
        .filter(Boolean)
        .filter(filteringByAspects)
        .filter(l => search === '' || l?.name.toLowerCase().includes(search.toLowerCase()))
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
    [cardList, filteringByAspects, search],
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
        <div className={cn({ 'cursor-pointer': editable })}>
          <CardImage forceHorizontal backSideButton={editable ? false : 'mid'} size={size}>
            <h6 className="flex gap-2">
              <Crown /> Leader
            </h6>
          </CardImage>
        </div>
      );
    }
    return (
      <div className={cn({ 'cursor-pointer': editable })}>
        <CardImage
          card={selectedLeader.card}
          cardVariantId={selectedLeader.variantId}
          forceHorizontal={true}
          backSideButton={editable ? false : 'mid'}
          size={size}
        />
      </div>
    );
  }, [selectedLeader, size]);

  const headerDescription = useMemo(() => {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-grow min-w-[200px]">
          <Input
            icon={Search}
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <MultiAspectFilter value={aspectFilter} onChange={setAspectFilter} multiSelect={true} />
      </div>
    );
  }, [search, aspectFilter]);

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
            if (onLeaderSelected) onLeaderSelected(localSelectedLeader?.card?.cardId);
            setOpen(false);
          }}
        >
          Save
        </Button>
      </div>
    );
  }, [onLeaderSelected, localSelectedLeader]);

  if (!editable) return trigger ?? localTrigger;

  return (
    <Dialog
      trigger={trigger ?? localTrigger}
      header={`Select a leader`}
      headerDescription={headerDescription}
      footer={footer}
      open={open}
      onOpenChange={setOpen}
      contentClassName={`md:max-w-[90%] min-h-[90%]`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {leaders.map(leader => (
            <div
              className="cursor-pointer"
              onClick={() => setLocalLeaderCardId(leader?.card?.cardId)}
              onDoubleClick={() => {
                const leaderId = leader?.card?.cardId;
                setLocalLeaderCardId(leaderId);
                if (onLeaderSelected) onLeaderSelected(leaderId);
                setOpen(false);
              }}
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
          {leaders.length === 0 && (
            <div className="flex flex-col gap-2">
              <h4>No leaders found</h4>
              <p>Try changing the search or filter.</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default LeaderSelector;
