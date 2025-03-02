import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import CollectionLayoutSettings from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutSettings.tsx';
import CollectionGroups from '@/components/app/collections/CollectionContents/CollectionGroups/CollectionGroups.tsx';
import { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import CollectionFilter from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionFilter.tsx';
import { useCollectionFilterStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionFilterStore.ts';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';

interface CollectionContentsProps {
  collectionId: string;
}

const CollectionContents: React.FC<CollectionContentsProps> = ({ collectionId }) => {
  const { data } = useGetCollectionCards(collectionId);
  const { search } = useCollectionFilterStore();

  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Set loading true before starting the computation.
    setLoading(true);

    // Use setTimeout to allow the UI to update and show the loading indicator.
    const handle = setTimeout(() => {
      const collectionCards = (data?.data ?? []) as unknown as CollectionCard[];

      if (search !== '') {
        const s = search.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
        setCards(collectionCards.filter(c => c.cardId.includes(s)));
      } else {
        setCards(collectionCards);
      }

      // End the loading state when done.
      setLoading(false);
    }, 0);

    return () => clearTimeout(handle);
  }, [search, data]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <Card>
        <CardHeader className="p-2 flex flex-col gap-2">
          <CollectionLayoutSettings />
          <CollectionFilter />
        </CardHeader>
      </Card>
      <div
        className={cn('flex', {
          'opacity-50': loading,
        })}
      >
        <CollectionGroups depth={0} cards={cards} collectionId={collectionId} loading={loading} />
      </div>
    </div>
  );
};

export default CollectionContents;
