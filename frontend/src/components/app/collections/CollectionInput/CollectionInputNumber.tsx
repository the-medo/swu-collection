import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input.tsx';

interface CollectionInputNumberProps {
  collectionId: string | undefined;
}

const CollectionInputNumber: React.FC<CollectionInputNumberProps> = ({ collectionId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insert cards by number</CardTitle>
        <CardDescription>
          Search for a card by number and insert it into the collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input />
        {collectionId}
      </CardContent>
    </Card>
  );
};

export default CollectionInputNumber;
