import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import CollectionInputName from '@/components/app/collections/CollectionInput/CollectionInputName/CollectionInputName.tsx';
import CollectionInputNumber from '@/components/app/collections/CollectionInput/CollectionInputNumber.tsx';
import CollectionInputBulk from '@/components/app/collections/CollectionInput/CollectionInputBulk.tsx';

interface CollectionInputSectionProps {
  collectionId: string | undefined;
}

const CollectionInputSection: React.FC<CollectionInputSectionProps> = ({ collectionId }) => {
  return (
    <Tabs defaultValue="name" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="name">Name</TabsTrigger>
        <TabsTrigger value="number">Number</TabsTrigger>
        <TabsTrigger value="bulk">Bulk</TabsTrigger>
      </TabsList>

      <TabsContent value="name">
        <CollectionInputName collectionId={collectionId} />
      </TabsContent>
      <TabsContent value="number">
        <CollectionInputNumber collectionId={collectionId} />
      </TabsContent>
      <TabsContent value="bulk">
        <CollectionInputBulk collectionId={collectionId} />
      </TabsContent>
    </Tabs>
  );
};

export default CollectionInputSection;
