import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  useCollectionCardSelectionActions,
  useCollectionCardSelectionStore,
} from '@/components/app/collections/CollectionCardSelection/useCollectionCardSelectionStore.ts';
import { useCollectionCardObjectsTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardObjectsTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useMemo } from 'react';
import CollectionCardAction from '@/components/app/collections/CollectionCardActions/CollectionCardAction.tsx';
import { collectionCardActionConfiguration } from '@/components/app/collections/CollectionCardSelection/collectionCardSelectionLib.ts';
import { useGetCollectionCardSelectionTemplateReplacements } from '@/components/app/collections/CollectionCardSelection/useGetCollectionCardSelectionTemplateReplacements.ts';
import { AddMultipleCollectionCardsItem } from '@/api/collections/useAddMultipleCollectionCards.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { signIn } from '@/lib/auth-client.ts';

interface CollectionCardSelectionProps {
  collectionId: string;
}

const CollectionCardSelection: React.FC<CollectionCardSelectionProps> = ({ collectionId }) => {
  const user = useUser();
  const { data: cardList } = useCardList();
  const selection = useCollectionCardSelectionStore(collectionId);
  const templateReplacements = useGetCollectionCardSelectionTemplateReplacements(collectionId);

  const { clearCollectionSelection } = useCollectionCardSelectionActions(collectionId);

  const columns = useCollectionCardObjectsTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: 'table-list',
    forceHorizontal: false,
  });

  const transformedSelection = useMemo(() => {
    const result: AddMultipleCollectionCardsItem[] = [];
    if (!selection?.cards) return result;
    for (const [cardId, variants] of Object.entries(selection.cards)) {
      for (const [variantId, subtypes] of Object.entries(variants)) {
        for (const subtype of subtypes) {
          result.push({
            cardId,
            variantId,
            foil: subtype.foil,
            condition: subtype.condition,
            language: subtype.language,
            note: subtype.note ?? '',
            amount: subtype.amount ?? 0,
            amount2: subtype.amount2,
            price: String(subtype.price),
          });
        }
      }
    }
    return result;
  }, [selection]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>Card selection</span>{' '}
          <div className="flex flex-col gap-0">
            <span className="font-normal text-sm text-gray-500">
              {transformedSelection.reduce((sum, c) => sum + (c.amount ?? 0), 0)} total cards
            </span>
          </div>
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          {transformedSelection.length === 0 ? (
            <div className="text-sm text-gray-500">
              No cards selected yet. Select cards to add them to a list.
            </div>
          ) : (
            <>
              <div className="flex flex-1 max-h-[400px] flex-col gap-2 overflow-y-auto">
                <DataTable columns={columns} data={transformedSelection} />
              </div>
              {user ? (
                <CollectionCardAction
                  items={transformedSelection}
                  configuration={collectionCardActionConfiguration}
                  templateReplacements={templateReplacements}
                  onFinish={clearCollectionSelection}
                />
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div className="text-sm text-gray-600">
                    Please sign in to continue with this action.
                  </div>
                  <Button onClick={() => signIn.social({ provider: 'google' })}>Sign in</Button>
                </div>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export default CollectionCardSelection;
