import { Card, CardContent } from '@/components/ui/card.tsx';
import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Copy, LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { cn } from '@/lib/utils.ts';
import DuplicateCollectionDialog from '@/components/app/dialogs/DuplicateCollectionDialog.tsx';
import { useUser } from '@/hooks/useUser.ts';
import AddToComparerButton from '@/components/app/comparer/SidebarComparer/AddToComparerButton.tsx';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';
import { useMemo } from 'react';

interface CollectionActionsProps {
  collectionId: string;
}

const CollectionActions: React.FC<CollectionActionsProps> = ({ collectionId }) => {
  const { toast } = useToast();
  const { data } = useGetCollection(collectionId);
  const user = useUser();
  const collectionLink = `${window.location.origin}/collections/${collectionId}`;

  const collectionType = data?.collection.collectionType;
  const additionalData: ComparerEntryAdditionalData = useMemo(
    () => ({
      title: data?.collection.title,
    }),
    [data?.collection],
  );

  return (
    <Card>
      <CardContent className="flex gap-2 items-center p-2 flex-wrap">
        <Button
          size="sm"
          className={cn({
            'opacity-80': !data?.collection.public,
          })}
          onClick={() => {
            navigator.clipboard.writeText(collectionLink);
            toast({
              title: `Link copied to clipboard`,
            });
          }}
        >
          <LinkIcon className="h-4 w-4" />
          Copy link {!data?.collection.public && '(private!)'}
        </Button>
        {data?.collection && (
          <DuplicateCollectionDialog
            collection={data.collection}
            trigger={
              <Button size="sm" disabled={!user}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
            }
          />
        )}
        <AddToComparerButton
          id={collectionId}
          dataType="collection"
          collectionType={collectionType}
          additionalData={additionalData}
          size="sm"
        />
      </CardContent>
    </Card>
  );
};

export default CollectionActions;
