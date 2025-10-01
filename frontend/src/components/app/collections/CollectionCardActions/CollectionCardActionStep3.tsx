import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft, MinusCircle, PlusCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { CollectionType } from '../../../../../../types/enums.ts';
import { useAddMultipleCollectionCards } from '@/api/collections/useAddMultipleCollectionCards.ts';
import { collectionTypeTitle } from '../../../../../../types/iterableEnumInfo.ts';
import { Link } from '@tanstack/react-router';
import { CollectionCardActionProps } from '@/components/app/collections/CollectionCardActions/CollectionCardAction.tsx';
import { resolveTemplatedText } from '@/components/app/collections/CollectionCardActions/collectionCardActionLib.ts';

interface CollectionCardActionStep3Props extends CollectionCardActionProps {
  collectionId: string;
  collectionTitle?: string;
  collectionType: CollectionType;
  onBack: () => void;
}

const CollectionCardActionStep3: React.FC<CollectionCardActionStep3Props> = ({
  items,
  collectionId,
  collectionTitle,
  collectionType,
  onBack,
  configuration,
  templateReplacements,
  onFinish,
}) => {
  const addMultipleMutation = useAddMultipleCollectionCards();
  const { step3 } = configuration;

  // Track if the instant action has been triggered during this component's lifecycle
  const instantActionTriggeredRef = useRef(false);

  const [completedAction, setCompletedAction] = useState<'insert' | 'remove' | undefined>(
    undefined,
  );

  const act = (remove: boolean) => {
    if (items.length === 0) return;
    setCompletedAction(undefined);
    addMultipleMutation.mutateAsync({ collectionId, items, remove }).then(() => {
      onFinish?.();
      setCompletedAction(remove ? 'remove' : 'insert');
    });
  };

  useEffect(() => {
    if (step3?.instantAction && !instantActionTriggeredRef.current) {
      instantActionTriggeredRef.current = true;
      void act(step3.instantAction.action === 'remove');
    }
    // Depend on collectionId and instantAction; the ref gates duplicate triggers during a single mount.
  }, [collectionId, step3?.instantAction]);

  const collectionUrl = `/collections/${collectionId}`;
  const isDone = addMultipleMutation.isSuccess && !!completedAction;

  if (collectionType === undefined) return null;
  const cardListString = collectionTypeTitle[collectionType];
  const totalCount = items.reduce((acc, item) => acc + item.amount, 0);

  const allowedActions = step3?.allowedActions ?? ['add', 'remove'];
  const showInsert = allowedActions.includes('add');
  const showRemove = allowedActions.includes('remove');

  return (
    <>
      <h4>{resolveTemplatedText(step3?.title, templateReplacements) ?? 'Finalize'}</h4>
      {collectionTitle && <h5>{collectionTitle}</h5>}
      <div className="text-sm">
        {resolveTemplatedText(step3?.description, templateReplacements) ??
          `Total cards to apply: ${totalCount}`}
      </div>

      {isDone ? (
        <>
          <div className="flex flex-col gap-2 bg-background p-2 rounded-md bg-green-100 dark:bg-green-900">
            <div className="mb-0 flex flex-1 flex-row gap-2 items-center justify-center text-green-600 dark:text-green-500">
              <CheckCircle2 />
              {completedAction === 'insert' ? 'Cards inserted' : 'Cards removed'} successfully!
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              size="icon"
              aria-label={`Go to back`}
              onClick={onBack}
              disabled={addMultipleMutation.isPending}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Link className="underline text-sm" to={collectionUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">
                Open {cardListString}
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}${collectionUrl}`)
              }
            >
              <LinkIcon className="h-4 w-4 mr-1" /> Copy link
            </Button>
          </div>
        </>
      ) : (
        <div className="flex justify-between items-center mt-2">
          <Button
            size="icon"
            aria-label={`Go to back`}
            onClick={onBack}
            disabled={addMultipleMutation.isPending}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            {showRemove && (
              <Button
                variant="outline"
                disabled={items.length === 0 || addMultipleMutation.isPending}
                onClick={() => act(true)}
                title="Remove cards (subtract amounts)"
              >
                <MinusCircle className="h-4 w-4 mr-1" /> Remove
              </Button>
            )}
            {showInsert && (
              <Button
                disabled={items.length === 0 || addMultipleMutation.isPending}
                onClick={() => act(false)}
                title="Insert cards (add amounts)"
              >
                <PlusCircle className="h-4 w-4 mr-1" /> Insert
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CollectionCardActionStep3;
