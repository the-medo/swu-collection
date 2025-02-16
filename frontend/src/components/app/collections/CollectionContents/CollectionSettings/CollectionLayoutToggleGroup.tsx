import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { CheckIcon, Grip, LayoutGrid, LayoutList, Rows4, XIcon } from 'lucide-react';
import {
  CollectionLayout,
  useCollectionInfo,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCallback } from 'react';
import { getRouteApi } from '@tanstack/react-router';

interface CollectionLayoutToggleGroupProps {
  value: CollectionLayout;
  setValue: (value: CollectionLayout) => void;
}

const CollectionLayoutToggleGroup: React.FC<CollectionLayoutToggleGroupProps> = ({
  value,
  setValue,
}) => {
  const { collectionId } = getRouteApi('/collections/$collectionId/').useParams();
  const { owned } = useCollectionInfo(collectionId);
  const { setCollectionInfo } = useCollectionLayoutStoreActions();

  const onValueChange = useCallback(
    (v: string) => {
      setValue(v as CollectionLayout);
    },
    [setValue],
  );
  const onOwnerChange = useCallback(
    (v: string) => {
      setCollectionInfo(collectionId, 'CZK', v === '1');
    },
    [setValue],
  );

  return (
    <>
      <ToggleGroup type="single" value={value} onValueChange={onValueChange}>
        <span className="font-bold">Layout: </span>
        <ToggleGroupItem value={CollectionLayout.TABLE_SMALL}>
          <Rows4 />
        </ToggleGroupItem>
        <ToggleGroupItem value={CollectionLayout.TABLE_IMAGE}>
          <LayoutList />
        </ToggleGroupItem>
        <ToggleGroupItem value={CollectionLayout.IMAGE_BIG}>
          <LayoutGrid />
        </ToggleGroupItem>
        <ToggleGroupItem value={CollectionLayout.IMAGE_SMALL}>
          <Grip />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" value={owned ? '1' : '0'} onValueChange={onOwnerChange}>
        <span className="font-bold">Owner: </span>
        <ToggleGroupItem value="1">
          <CheckIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="0">
          <XIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    </>
  );
};

export default CollectionLayoutToggleGroup;
