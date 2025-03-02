import { Card, CardContent } from '@/components/ui/card.tsx';
import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { BookCopy, LinkIcon, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { cn } from '@/lib/utils.ts';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionActionsProps {
  collectionId: string;
}

const CollectionActions: React.FC<CollectionActionsProps> = ({ collectionId }) => {
  const { toast } = useToast();
  const { data } = useGetCollection(collectionId);
  const { collectionOrWantlist } = useCollectionInfo(collectionId);
  const collectionLink = `${window.location.origin}/collections/${collectionId}`;

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
        <Button size="sm" disabled onClick={() => {}}>
          <BookCopy className="h-4 w-4" />
          Duplicate
        </Button>
        <Button size="sm" disabled onClick={() => {}}>
          <ScrollText className="h-4 w-4" />
          Compare with {collectionOrWantlist === 'Collection' ? 'wantlist' : 'collection'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CollectionActions;
