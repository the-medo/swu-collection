import {
  useGroupCards,
  useCollectionGroupInfo,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import * as React from 'react';
import CollectionGroups from './CollectionGroups';

// Interface for rendering group items
interface CollectionGroupItemProps {
  id: string;
  parentTitle: string;
  horizontal: boolean;
  collectionId: string;
}

const CollectionGroupItem: React.FC<CollectionGroupItemProps> = ({
  id,
  parentTitle,
  horizontal,
  collectionId,
}) => {
  // Call hooks at the top level of this component
  const cardKeys = useGroupCards(id);
  const groupInfo = useCollectionGroupInfo(id);

  if (!groupInfo || cardKeys.length === 0) return null;

  const label = groupInfo.label;
  const title = parentTitle !== '' ? `${parentTitle} - ${label}` : label;

  return (
    <AccordionItem key={id} value={id}>
      <AccordionTrigger>
        {title} ({cardKeys.length})
      </AccordionTrigger>
      <AccordionContent>
        <CollectionGroups
          key={id}
          horizontal={horizontal}
          parentTitle={title}
          collectionId={collectionId}
          groupId={id}
        />
      </AccordionContent>
    </AccordionItem>
  );
};

export default CollectionGroupItem;
