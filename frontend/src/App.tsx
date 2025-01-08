import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

async function getCollectionSize() {
  const response = await api.collection['collection-size'].$get();
  if (!response.ok) {
    throw new Error('Something went wrong');
  }
  const data = await response.json();
  return data;
}

function App() {
  const { isPending, isFetching, error, data } = useQuery({
    queryKey: ['get-collection-size'],
    queryFn: getCollectionSize,
  });

  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-8">
      <Card className="w-4/12 m-auto">
        <CardHeader>
          <CardTitle>SWU Collection</CardTitle>
          <CardDescription>Collection total </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Total: {isPending || isFetching ? '...' : data.totalOwned}</p>
        </CardContent>
        <CardFooter>{/*<p>Card Footer</p>*/}</CardFooter>
      </Card>
    </div>
  );
}

export default App;
