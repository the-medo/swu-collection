import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { useEffect, useState } from 'react';

function App() {
  const [collectionSize, setCollectionSize] = useState(0);

  useEffect(() => {
    async function fetchCollectionSize() {
      const response = await fetch('/api/collection/collection-size');
      const data = await response.json();
      setCollectionSize(data.totalOwned);
    }
    fetchCollectionSize();
  }, []);

  return (
    <div className="p-8">
      <Card className="w-4/12 m-auto">
        <CardHeader>
          <CardTitle>SWU Collection</CardTitle>
          <CardDescription>Collection total </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Total: {collectionSize}</p>
        </CardContent>
        <CardFooter>{/*<p>Card Footer</p>*/}</CardFooter>
      </Card>
    </div>
  );
}

export default App;
