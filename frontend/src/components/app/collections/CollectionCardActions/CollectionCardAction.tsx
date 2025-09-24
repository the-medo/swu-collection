import React from 'react';
import CollectionCardActionStep1 from '@/components/app/collections/CollectionCardActions/CollectionCardActionStep1.tsx';
import {
  CollectionCardActionConfiguration,
  CollectionCardActionItems,
} from '@/components/app/collections/CollectionCardActions/collectionCardActionLib.ts';

export interface CollectionCardActionProps
  extends CollectionCardActionItems,
    CollectionCardActionConfiguration {}

const CollectionCardAction: React.FC<CollectionCardActionProps> = ({
  ...itemsAndConfiguration
}) => {
  return <CollectionCardActionStep1 {...itemsAndConfiguration} />;
};

export default CollectionCardAction;
