import { api } from '@/lib/api.ts';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/data-table.tsx';
import { collectionCardTableLib } from '@/components/app/collections/CollectionTable/collectionCardTableLib.tsx';

async function getCollection() {
  const response = await api.collection.$get();
  if (!response.ok) {
    throw new Error('Something went wrong');
  }
  const data = await response.json();
  return data;
}

function CollectionCardTable() {
  const { isPending, isFetching, error, data } = useQuery({
    queryKey: ['get-collection'],
    queryFn: getCollection,
  });

  if (error) return <p>Error: {error.message}</p>;

  if (isPending || isFetching) return <p>Loading...</p>;
  return (
    <div className="w-9/12">
      <DataTable columns={collectionCardTableLib} data={data.collection} />
    </div>
  );
}

export default CollectionCardTable;
