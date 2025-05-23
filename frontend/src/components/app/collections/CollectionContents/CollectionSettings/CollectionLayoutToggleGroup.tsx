import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { Grip, LayoutGrid, LayoutList, Rows4 } from 'lucide-react';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCallback } from 'react';

interface CollectionLayoutToggleGroupProps {
  value: CollectionLayout;
  setValue: (value: CollectionLayout) => void;
}

const CollectionLayoutToggleGroup: React.FC<CollectionLayoutToggleGroupProps> = ({
  value,
  setValue,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      setValue(v as CollectionLayout);
    },
    [setValue],
  );

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <span className="font-bold max-md:w-[100px]">Layout: </span>
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
  );
};

export default CollectionLayoutToggleGroup;
