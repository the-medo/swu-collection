import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage, { CardImageVariantProps } from '@/components/app/global/CardImage.tsx';
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
import { Switch } from '@/components/ui/switch.tsx';
import { cn } from '@/lib/utils.ts';

type BaseSelectorProps = Pick<DialogProps, 'trigger'> & {
  baseCardId?: string;
  onBaseSelected?: (baseCardId: string | undefined) => void;
  editable?: boolean;
  size?: CardImageVariantProps['size'];
};

const BaseSelector: React.FC<BaseSelectorProps> = ({
  trigger,
  baseCardId,
  onBaseSelected,
  editable = true,
  size = 'w200',
}) => {
  const [open, setOpen] = useState(false);
  const [allBasicBases, setAllBasicBases] = useState(false);
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

  const filteringByBasicBases = useCallback(
    (card: CardDataWithVariants<CardListVariants> | undefined) => {
      if (allBasicBases || search !== '') return true;
      return card?.text !== '' && card?.text !== null;
    },
    [search, allBasicBases],
  );

  const oneBasicBaseOfEach = useMemo(() => {
    if (allBasicBases || search !== '') return [];
    const sorBasicBases: Record<string, true | undefined> = {
      'capital-city': true, // vigilance
      'command-center': true, // command
      'catacombs-of-cadera': true, // aggression
      'administrator-s-tower': true, // cunning
    };

    return Object.values(cardList?.cardsByCardType['Base'] ?? {}).filter(
      (card: CardDataWithVariants<CardListVariants> | undefined) => {
        return sorBasicBases[card?.cardId ?? ''];
      },
    );
  }, [search, allBasicBases]);

  const allBases = useMemo(() => {
    return Object.values(cardList?.cardsByCardType['Base'] ?? {}).filter(Boolean);
  }, [cardList?.cardsByCardType['Base']]);

  const bases = useMemo(
    () =>
      allBases
        .filter(filteringByBasicBases)
        .concat(oneBasicBaseOfEach)
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
        })
        .sort((a, b) => {
          return (a.card?.text === '' || a.card?.text === null) &&
            b.card?.text !== '' &&
            b.card?.text !== null
            ? -1
            : 0;
        }),
    [cardList, filteringByAspects, filteringByBasicBases, search],
  );

  const selectedBase = useMemo(() => {
    return allBases.find(base => base?.cardId === baseCardId);
  }, [allBases, baseCardId]);

  const localSelectedBase = useMemo(() => {
    return allBases.find(base => base?.cardId === localBaseCardId);
  }, [localBaseCardId]);

  const localTrigger = useMemo(() => {
    if (!selectedBase) {
      return (
        <div className={cn({ 'cursor-pointer': editable })}>
          <CardImage forceHorizontal size={size}>
            <h6 className="flex gap-2">
              <Castle /> Base
            </h6>
          </CardImage>
        </div>
      );
    }
    return (
      <div className={cn({ 'cursor-pointer': editable })}>
        <CardImage
          card={selectedBase}
          cardVariantId={selectDefaultVariant(selectedBase)}
          forceHorizontal={true}
          size={size}
        />
      </div>
    );
  }, [selectedBase, size]);

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
        <div className="flex flex-row items-center gap-2">
          <label htmlFor="switch-1" className="font-semibold">
            Display all basic bases
          </label>
          <Switch id="switch-1" checked={allBasicBases} onCheckedChange={setAllBasicBases} />
        </div>
      </div>
    );
  }, [search, aspectFilter, allBasicBases]);

  const handleSave = useCallback(
    (baseCardId: string | undefined) => {
      setOpen(false); // First close the dialog

      // Then use a small timeout to update the state AFTER the dialog has closed
      setTimeout(() => {
        if (onBaseSelected) onBaseSelected(baseCardId);
      }, 10);
    },
    [onBaseSelected],
  );

  const footer = useMemo(() => {
    return (
      <div className="flex flex-wrap gap-2 w-full justify-between items-center">
        <div className="flex flex-wrap gap-2 items-center">
          <CardImage
            card={localSelectedBase}
            cardVariantId={localSelectedBase ? selectDefaultVariant(localSelectedBase) : undefined}
            forceHorizontal={true}
            size="w100"
            backSideButton={false}
          />

          {localSelectedBase ? (
            <>
              <h4>{localSelectedBase?.name} </h4>
              <Button onClick={() => setLocalBaseCardId(undefined)} variant="outline">
                Clear
              </Button>
            </>
          ) : (
            <h4>No selected base</h4>
          )}
        </div>
        <Button onClick={() => handleSave(localSelectedBase?.cardId)}>Save</Button>
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
              onDoubleClick={() => handleSave(base?.card?.cardId)}
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
