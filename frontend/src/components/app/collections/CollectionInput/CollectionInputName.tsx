import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input.tsx';

interface CollectionInputNameProps {
  collectionId: string | undefined;
}

const CollectionInputName: React.FC<CollectionInputNameProps> = ({ collectionId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insert cards by name</CardTitle>
        <CardDescription>
          Search for a card, select version and insert it into the collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input />
        {collectionId}
      </CardContent>
    </Card>
  );
};

export default CollectionInputName;
