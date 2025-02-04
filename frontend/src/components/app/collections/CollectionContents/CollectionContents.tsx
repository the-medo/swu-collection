import { useGetCollectionCards } from '@/api/useGetCollectionCards.ts';

interface CollectionContentsProps {
  collectionId: string;
}

const CollectionContents: React.FC<CollectionContentsProps> = ({ collectionId }) => {
  const { data, isFetching } = useGetCollectionCards(collectionId);

  const loading = isFetching;

  return (
    <>
      {loading}
      {JSON.stringify(data)}
    </>
  );
};

export default CollectionContents;
