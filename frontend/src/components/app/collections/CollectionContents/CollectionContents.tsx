import { useGetCollectionCards } from '@/api/useGetCollectionCards.ts';
import CollectionLayoutSettings from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/CollectionLayoutSettings.tsx';
import CollectionGroups from '@/components/app/collections/CollectionContents/CollectionGroups/CollectionGroups.tsx';
import { CollectionCard } from '../../../../../../types/CollectionCard.ts';

interface CollectionContentsProps {
  collectionId: string;
}

const CollectionContents: React.FC<CollectionContentsProps> = ({ collectionId }) => {
  const { data } = useGetCollectionCards(collectionId);

  const cards = (data?.data ?? []) as unknown as CollectionCard[];

  return (
    <div className="flex flex-col gap-2 w-full">
      <CollectionLayoutSettings />
      <CollectionGroups depth={0} cards={cards} collectionId={collectionId} />
    </div>
  );
};

export default CollectionContents;
