import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input.tsx';

interface CollectionInputBulkProps {
  collectionId: string | undefined;
}

const CollectionInputBulk: React.FC<CollectionInputBulkProps> = ({ collectionId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk insert of cards</CardTitle>
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

export default CollectionInputBulk;
