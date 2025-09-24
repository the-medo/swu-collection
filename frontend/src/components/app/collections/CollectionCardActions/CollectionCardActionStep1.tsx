import React, { useEffect, useMemo, useState } from 'react';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';
import { BookOpenCheck, NotebookTabs, ScrollText } from 'lucide-react';
import { ActionSelectorRow } from '@/components/app/collections/CollectionCardActions/ActionSelectorRow.tsx';
import { CollectionType } from '../../../../../../types/enums.ts';
import CollectionCardActionStep2 from '@/components/app/collections/CollectionCardActions/CollectionCardActionStep2.tsx';
import { CollectionCardActionProps } from '@/components/app/collections/CollectionCardActions/CollectionCardAction.tsx';

interface CollectionCardActionStep1Props extends CollectionCardActionProps {}

const CollectionCardActionStep1: React.FC<CollectionCardActionStep1Props> = ({
  items,
  configuration,
}) => {
  const { step1 } = configuration;
  const { data } = useUserCollectionsData();
  const [actionCollectionType, setActionCollectionType] = useState<CollectionType | undefined>(
    step1?.defaultSelectedCollectionType,
  );

  const collectionInfo = data?.info;

  useEffect(() => {
    if (step1?.defaultSelectedCollectionType) {
      setActionCollectionType(step1.defaultSelectedCollectionType);
    }
  }, [step1?.defaultSelectedCollectionType]);

  const getIdArray = () => {
    if (!collectionInfo || actionCollectionType === undefined) return undefined;
    switch (actionCollectionType) {
      case CollectionType.COLLECTION:
        return collectionInfo.collections?.idArray;
      case CollectionType.WANTLIST:
        return collectionInfo.wantlists?.idArray;
      case CollectionType.OTHER:
        return collectionInfo.cardlists?.idArray;
      default:
        return undefined;
    }
  };

  const rows = useMemo(() => {
    const all: { type: CollectionType; title: string; description: string; icon: JSX.Element }[] = [
      {
        type: CollectionType.COLLECTION,
        title: step1?.collectionTypeData?.[CollectionType.COLLECTION]?.title ?? 'Add to collection',
        description:
          step1?.collectionTypeData?.[CollectionType.COLLECTION]?.description ??
          'You have these cards and want to add them to collection.',
        icon: <BookOpenCheck />,
      },
      {
        type: CollectionType.WANTLIST,
        title: step1?.collectionTypeData?.[CollectionType.WANTLIST]?.title ?? 'Add to wantlist',
        description:
          step1?.collectionTypeData?.[CollectionType.WANTLIST]?.description ??
          'You want these cards.',
        icon: <ScrollText />,
      },
      {
        type: CollectionType.OTHER,
        title: step1?.collectionTypeData?.[CollectionType.OTHER]?.title ?? 'Add to card list',
        description:
          step1?.collectionTypeData?.[CollectionType.OTHER]?.description ??
          'Special-purpose lists, for example proxies',
        icon: <NotebookTabs />,
      },
    ];
    const allowed = step1?.allowedCollectionTypes;
    return allowed ? all.filter(r => allowed.includes(r.type)) : all;
  }, [step1]);

  if (actionCollectionType && collectionInfo) {
    return (
      <CollectionCardActionStep2
        collectionType={actionCollectionType}
        collectionMap={collectionInfo.map}
        collectionIdArray={getIdArray()}
        setActionCollectionType={setActionCollectionType}
        items={items}
        configuration={configuration}
      />
    );
  }

  return (
    <>
      <h4>{step1?.title ?? 'Action'}</h4>
      {step1?.description ?? 'Do a bulk action with missing cards from this deck.'}
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <ActionSelectorRow
            key={r.type}
            title={r.title}
            description={r.description}
            icon={r.icon}
            onClick={() => setActionCollectionType(r.type)}
          />
        ))}
      </div>
    </>
  );
};

export default CollectionCardActionStep1;
