import React from 'react';
import CollectionCardActionStep1 from '@/components/app/collections/CollectionCardActions/CollectionCardActionStep1.tsx';
import {
  CollectionCardActionConfiguration,
  CollectionCardActionItems,
} from '@/components/app/collections/CollectionCardActions/collectionCardActionLib.ts';

export interface CollectionCardActionProps extends CollectionCardActionItems {
  configuration: CollectionCardActionConfiguration;
  templateReplacements: Record<string, string>;
}

const CollectionCardAction: React.FC<CollectionCardActionProps> = ({
  items,
  configuration,
  templateReplacements,
}) => {
  return (
    <CollectionCardActionStep1
      items={items}
      configuration={configuration}
      templateReplacements={templateReplacements}
    />
  );
};

export default CollectionCardAction;
