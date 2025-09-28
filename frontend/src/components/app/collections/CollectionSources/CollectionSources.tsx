import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import * as React from 'react';
import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { useGetCollectionSources } from '@/api/collections/useGetCollectionSources.ts';
import { CollectionType } from '../../../../../../types/enums.ts';
import { useMemo, useState, useCallback, useEffect } from 'react';
import SourceBox from './SourceBox';
import { Button } from '@/components/ui/button.tsx';
import { useApplyCollection } from '@/api/collections/useApplyCollection.ts';

interface CollectionSourcesProps {
  collectionId: string;
  owned: boolean;
}

const CollectionSources: React.FC<CollectionSourcesProps> = ({ collectionId, owned }) => {
  const { data, isFetching } = useGetCollection(collectionId);

  /**
   * Based on CollectionType of this collection, we assume `target` prop:
   * Basically, collections and wantlists are always "sources", because card lists (trade lists) were created from them.
   * Other collections (card lists = trade lists) are always "targets", because they were (probably!) created from collections or wantlists.
   *
   * CollectionType.COLLECTION => source
   * CollectionType.WANTLIST   => source
   * CollectionType.OTHER      => target
   */
  const collectionType = data?.collection.collectionType;
  const { mutate: applyCollection, isPending: isApplying } = useApplyCollection();
  const { data: sources, isFetching: isFetchingSources } = useGetCollectionSources({
    id: collectionId,
    target: collectionType === CollectionType.OTHER ? 'target' : 'source',
    displayOnSource: collectionType === CollectionType.OTHER ? undefined : true,
  });

  const isLoading = isFetching || isFetchingSources;

  // Selection state (only for owners)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCollectionId(null);
  }, [collectionId]);

  //my own collection/wantlist (i can apply someone else's card list)
  const applyingToMyOwnOpenedCollectionOrWantlist =
    owned && collectionType !== CollectionType.OTHER;
  //opened NOT my own card list (i can apply to my collection/wantlist)
  const applyingOpenedCardListToMyOwnSelectedCollectionOrWantlist =
    !owned && collectionType === CollectionType.OTHER;

  const canSelect =
    applyingToMyOwnOpenedCollectionOrWantlist ||
    applyingOpenedCardListToMyOwnSelectedCollectionOrWantlist;
  const allowedToApply = canSelect && !!selectedCollectionId; // && collectionType !== CollectionType.OTHER;

  console.log({
    applyingToMyOwnOpenedCollectionOrWantlist,
    applyingOpenedCardListToMyOwnSelectedCollectionOrWantlist,
    canSelect,
    allowedToApply,
  });

  const onSelect = useCallback(
    (id: string) => {
      if (!canSelect) return;
      setSelectedCollectionId(prev => (prev === id ? null : id));
    },
    [canSelect],
  );

  const sectionDescription = useMemo(() => {
    if (!sources) return '';
    if (sources.length ?? 0 > 0) {
      if (owned) {
        if (collectionType === CollectionType.COLLECTION) {
          return 'This collection is connected to the following card lists:';
        } else if (collectionType === CollectionType.WANTLIST) {
          return 'This wantlist is connected to the following card lists:';
        } else if (collectionType === CollectionType.OTHER) {
          return 'This card list is connected to the following collections / want lists:';
        }
      } else {
        if (collectionType === CollectionType.COLLECTION) {
          return 'This collection is connected to your card lists:';
        } else if (collectionType === CollectionType.WANTLIST) {
          return 'This wantlist is connected to your card lists:';
        } else if (collectionType === CollectionType.OTHER) {
          return 'This card list is connected to your collections / want lists:';
        }
      }
    } else {
      if (collectionType === CollectionType.COLLECTION) {
        return 'This collection has no connections to other card lists.';
      } else if (collectionType === CollectionType.WANTLIST) {
        return 'This wantlist has no connections to other card lists.';
      } else if (collectionType === CollectionType.OTHER) {
        return 'This card list is not connected to any collections / want lists:';
      }
    }
    return '';
  }, [sources?.length, owned, collectionType]);

  const { handleApply, buttonTitle, description } = useMemo(() => {
    let buttonTitle = `Apply`;
    let description = undefined;

    const emptyReturn = {
      handleApply: () => {},
      buttonTitle,
      description,
    };

    if (!allowedToApply || !collectionType) {
      return emptyReturn;
    }
    let collectionIdToApply = selectedCollectionId;
    let collectionIdItWillBeAppliedTo = collectionId;
    const selectedSource = sources?.find(c => c.collection.id === selectedCollectionId);

    if (!selectedSource) {
      return emptyReturn;
    }

    if (applyingToMyOwnOpenedCollectionOrWantlist) {
      if (collectionType === CollectionType.COLLECTION) {
        buttonTitle = `Apply selected list to opened collection`;
        description = `This action will remove these cards from your collection!`;
      } else if (collectionType === CollectionType.WANTLIST) {
        buttonTitle = `Apply selected list to opened wantlist`;
        description = `This action will remove these cards from your wantlist!`;
      }
    } else if (applyingOpenedCardListToMyOwnSelectedCollectionOrWantlist) {
      const selectedSourceCollectionType = selectedSource?.collection.collectionType;
      collectionIdToApply = collectionId;
      collectionIdItWillBeAppliedTo = selectedCollectionId;
      if (selectedSourceCollectionType === CollectionType.COLLECTION) {
        buttonTitle = `Apply opened list to selected collection`;
        description = `This action will remove these cards from your collection!`;
      } else if (selectedSourceCollectionType === CollectionType.WANTLIST) {
        buttonTitle = `Apply opened list to selected wantlist`;
        description = `This action will remove these cards from your wantlist!`;
      }
    }

    return {
      handleApply: () =>
        applyCollection({
          collectionId: collectionIdItWillBeAppliedTo,
          collectionIdToApply,
          operation: 'remove',
        }),
      buttonTitle,
      description,
    };
  }, [applyCollection, collectionId, allowedToApply, selectedCollectionId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>Connections</span>
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          {isLoading && <span>Loading...</span>}
          {!isLoading && (!sources || sources.length === 0) && (
            <span>All connected card lists will be visible here.</span>
          )}
          {sectionDescription && <span>{sectionDescription}</span>}
          {!isLoading && sources && sources.length > 0 && (
            <div className="max-h-[400px] overflow-y-auto">
              <div className="flex flex-col gap-2 pr-2">
                {sources.map(row => (
                  <SourceBox
                    key={row.collectionSource.id}
                    row={row}
                    selected={allowedToApply ? row.collection.id === selectedCollectionId : false}
                    onSelect={canSelect ? () => onSelect(row.collection.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
          {allowedToApply && (
            <>
              {description}
              <Button size="sm" onClick={handleApply} disabled={isApplying}>
                {isApplying ? 'Applying...' : buttonTitle}
              </Button>
            </>
          )}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export default CollectionSources;
