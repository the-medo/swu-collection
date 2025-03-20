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
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface CollectionInputSectionProps {
  collectionId: string;
}

const CollectionInputSection: React.FC<CollectionInputSectionProps> = ({ collectionId }) => {
  const { collectionOrWantlist } = useCollectionInfo(collectionId);
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(!isMobile);

  useEffect(() => {
    if (!isMobile) {
      setOpen(true);
    }
  }, [isMobile]);

  return (
    <Card>
      <Tabs defaultValue="name" className="w-full md:w-[400px]">
        <CardHeader className={cn({ 'p-2': isMobile }, ' pb-0')}>
          <CardTitle className="pb-2 flex gap-2 items-center">
            {isMobile && (
              <Button onClick={() => setOpen(p => !p)} size="icon" variant="ghost" className="p-0">
                <ChevronRight className={cn('h-4 w-4 transition-all', { 'rotate-90': open })} />
              </Button>
            )}
            <span>Insert cards to {collectionOrWantlist?.toLowerCase()}</span>
          </CardTitle>
          {open && (
            <CardDescription>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="name">Name</TabsTrigger>
                <TabsTrigger value="number">Number</TabsTrigger>
                <TabsTrigger value="bulk">Bulk</TabsTrigger>
                <TabsTrigger value="import">Import</TabsTrigger>
              </TabsList>
            </CardDescription>
          )}
        </CardHeader>
        {open && (
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
        )}
      </Tabs>
    </Card>
  );
};

export default CollectionInputSection;
