import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { sortCardsByCardAspects } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import { Button } from '@/components/ui/button.tsx';
import { Castle, Search } from 'lucide-react';
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

type BaseSelectorProps = Pick<DialogProps, 'trigger'> & {
  baseCardId?: string;
  onBaseSelected: (baseCardId: string | undefined) => void;
};

const BaseSelector: React.FC<BaseSelectorProps> = ({ trigger, baseCardId, onBaseSelected }) => {
  const [open, setOpen] = useState(false);
  const [localBaseCardId, setLocalBaseCardId] = useState<string | undefined>(baseCardId);
  const [search, setSearch] = useState<string>('');
  const [aspectFilter, setAspectFilter] = useState<SwuAspect[]>(aspectArray);
  const { data: cardList } = useCardList();

  const baseSorter = useMemo(
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

      return notFoundAspect === undefined;
    },
    [transformedAspectsForFilter],
  );

  const bases = useMemo(
    () =>
      Object.values(cardList?.cardsByCardType['Base'] ?? {})
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
          if (!baseSorter) return 0;
          return baseSorter(a.fakeCollectionCardForSorting, b.fakeCollectionCardForSorting);
        }),
    [cardList, filteringByAspects, search],
  );

  const selectedBase = useMemo(() => {
    return bases.find(base => base?.card?.cardId === baseCardId);
  }, [baseCardId]);

  const localSelectedBase = useMemo(() => {
    return bases.find(base => base?.card?.cardId === localBaseCardId);
  }, [localBaseCardId]);

  const localTrigger = useMemo(() => {
    if (!selectedBase) {
      return (
        <div className="cursor-pointer">
          <CardImage forceHorizontal size="w200">
            <h6 className="flex gap-2">
              <Castle /> Base
            </h6>
          </CardImage>
        </div>
      );
    }
    return (
      <div className="cursor-pointer">
        <CardImage
          card={selectedBase.card}
          cardVariantId={selectedBase.variantId}
          forceHorizontal={true}
        />
      </div>
    );
  }, [selectedBase]);

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
            card={localSelectedBase?.card}
            cardVariantId={localSelectedBase?.variantId}
            forceHorizontal={true}
            size="w100"
            backSideButton={false}
          />

          {localSelectedBase ? (
            <>
              <h4>{localSelectedBase?.card?.name} </h4>
              <Button onClick={() => setLocalBaseCardId(undefined)} variant="outline">
                Clear
              </Button>
            </>
          ) : (
            <h4>No selected base</h4>
          )}
        </div>
        <Button
          onClick={() => {
            onBaseSelected(localSelectedBase?.card?.cardId);
            setOpen(false);
          }}
        >
          Save
        </Button>
      </div>
    );
  }, [onBaseSelected, localSelectedBase]);

  return (
    <Dialog
      trigger={trigger ?? localTrigger}
      header={`Select a base`}
      headerDescription={headerDescription}
      footer={footer}
      open={open}
      onOpenChange={setOpen}
      contentClassName={`md:max-w-[90%] min-h-[90%]`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {bases.map(base => (
            <div
              className="cursor-pointer"
              onClick={() => setLocalBaseCardId(base?.card?.cardId)}
              key={base?.card?.cardId}
            >
              <CardImage
                key={base?.card?.cardId}
                card={base.card}
                cardVariantId={base.variantId}
                forceHorizontal={true}
                size="w300"
              />
            </div>
          ))}
          {bases.length === 0 && (
            <div className="flex flex-col gap-2">
              <h4>No bases found</h4>
              <p>Try changing the search or filter.</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default BaseSelector;
