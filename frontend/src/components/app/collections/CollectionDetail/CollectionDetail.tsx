import { useGetCollection } from '@/api/useGetCollection.ts';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import LoadingTitle from '../../global/LoadingTitle';
import CollectionInputSection from '@/components/app/collections/CollectionInput/CollectionInputSection.tsx';
import CollectionContents from '@/components/app/collections/CollectionContents/CollectionContents.tsx';

const routeApi = getRouteApi('/collections/$collectionId/');

const CollectionDetail: React.FC = () => {
  const user = useUser();
  const { collectionId } = routeApi.useParams();
  const { data, isFetching } = useGetCollection(collectionId);

  const collectionUserId = data?.user.id ?? '';
  const loading = isFetching;

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
        {user?.id === collectionUserId && <CollectionInputSection collectionId={collectionId} />}
      </div>
    </>
  );
};

export default CollectionDetail;
