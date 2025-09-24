import React from 'react';
import { CollectionType } from '../../../../../../types/enums.ts';
import { collectionTypeTitle } from '../../../../../../types/iterableEnumInfo.ts';
import { Collection } from '../../../../../../types/Collection.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

export interface AddToExistingBoxProps {
  collectionType: CollectionType;
  collectionMap: Record<string, Collection>;
  collectionIdArray: string[] | undefined;
  selectedId?: string;
  onChange?: (id: string) => void;
}

const AddToExistingBox: React.FC<AddToExistingBoxProps> = ({
  collectionType,
  collectionMap,
  collectionIdArray,
  selectedId,
  onChange,
}) => {
  const options = (collectionIdArray ?? [])
    .filter(id => collectionMap?.[id]?.collectionType === collectionType)
    .map(id => ({
      id,
      title: collectionMap?.[id]?.title ?? id,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  const cardListString = collectionTypeTitle[collectionType];

  return (
    <div className="flex flex-col gap-2 bg-background p-2 rounded-md">
      <h5 className="mb-0">Add to existing {cardListString}</h5>
      <Select value={selectedId} onValueChange={val => onChange?.(val)}>
        <SelectTrigger className="bg-card">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AddToExistingBox;
