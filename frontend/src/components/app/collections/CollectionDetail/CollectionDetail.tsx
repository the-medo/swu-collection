import { useGetCollection } from '@/api/useGetCollection.ts';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import LoadingTitle from '../../global/LoadingTitle';
import CollectionInputSection from '@/components/app/collections/CollectionInput/CollectionInputSection.tsx';
import CollectionContents from '@/components/app/collections/CollectionContents/CollectionContents.tsx';
import { useEffect } from 'react';
import { useCollectionLayoutStoreActions } from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';

const routeApi = getRouteApi('/collections/$collectionId/');

const CollectionDetail: React.FC = () => {
  const user = useUser();
  const { collectionId } = routeApi.useParams();
  const { data, isFetching } = useGetCollection(collectionId);
  const { setCollectionInfo } = useCollectionLayoutStoreActions();

  const collectionUserId = data?.user.id ?? '';
  const collectionCurrency = data?.user.currency;
  const loading = isFetching;
  const owned = user?.id === collectionUserId;

  useEffect(() => {
    setCollectionInfo(collectionId, collectionCurrency ?? '-', owned);
  }, [owned, collectionCurrency]);

  return (
    <>
      <LoadingTitle
        mainTitle={data?.collection.title}
        subTitle={
          <>
            collection by{' '}
            <Link to={`/users/$userId`} params={{ userId: collectionUserId }}>
              {data?.user.displayName}
            </Link>
          </>
        }
        loading={loading}
      />
      <div className="flex flex-row gap-4">
        <CollectionContents collectionId={collectionId} />
        {owned && <CollectionInputSection collectionId={collectionId} />}
      </div>
    </>
  );
};

export default CollectionDetail;
