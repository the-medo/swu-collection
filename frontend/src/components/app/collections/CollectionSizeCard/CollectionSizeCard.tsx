import { api } from '@/lib/api.ts';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';

async function getCollectionSize() {
  const response = await api.collection['collection-size'].$get();
  if (!response.ok) {
    throw new Error('Something went wrong');
  }
  const data = await response.json();
  return data;
}

function CollectionSizeCard() {
  const { isPending, isFetching, error, data } = useQuery({
    queryKey: ['get-collection-size'],
    queryFn: getCollectionSize,
  });

  if (error) return <p>Error: {error.message}</p>;

  return (
    <Card className="w-3/12">
      <CardHeader>
        <CardTitle>SWU Collection</CardTitle>
        <CardDescription>Collection total </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Total: {isPending || isFetching ? '...' : data.totalOwned}</p>
      </CardContent>
    </Card>
  );
}

export default CollectionSizeCard;
