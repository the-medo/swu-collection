import { Card, CardHeader } from '@/components/ui/card.tsx';
import CollectionFilterInput from '@/components/app/collections/CollectionContents/CollectionFilter/CollectionFilterInput.tsx';

interface CollectionFilterProps {}

const CollectionFilter: React.FC<CollectionFilterProps> = ({}) => {
  return (
    <Card>
      <CardHeader className="p-2">
        <div className="flex gap-2">
          <CollectionFilterInput />
        </div>
      </CardHeader>
    </Card>
  );
};

export default CollectionFilter;
