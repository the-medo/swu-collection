import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import CollectionInputName from '@/components/app/collections/CollectionInput/CollectionInputName/CollectionInputName.tsx';
import CollectionInputNumber from '@/components/app/collections/CollectionInput/CollectionInputNumber/CollectionInputNumber.tsx';
import CollectionInputBulk from '@/components/app/collections/CollectionInput/CollectionInputBulk/CollectionInputBulk.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import * as React from 'react';
import CollectionInputImport from '@/components/app/collections/CollectionInput/CollectionInputImport/CollectionInputImport.tsx';

interface CollectionInputSectionProps {
  collectionId: string;
}

const CollectionInputSection: React.FC<CollectionInputSectionProps> = ({ collectionId }) => {
  return (
    <Card>
      <Tabs defaultValue="name" className="w-[400px]">
        <CardHeader className="pb-0">
          <CardTitle className="pb-2">Insert cards to collection </CardTitle>
          <CardDescription>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="name">Name</TabsTrigger>
              <TabsTrigger value="number">Number</TabsTrigger>
              <TabsTrigger value="bulk">Bulk</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
            </TabsList>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TabsContent value="name">
            <CollectionInputName collectionId={collectionId} />
          </TabsContent>
          <TabsContent value="number">
            <CollectionInputNumber collectionId={collectionId} />
          </TabsContent>
          <TabsContent value="bulk">
            <CollectionInputBulk collectionId={collectionId} />
          </TabsContent>
          <TabsContent value="import">
            <CollectionInputImport collectionId={collectionId} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default CollectionInputSection;
