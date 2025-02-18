import {
  CollectionSortBy,
  SORT_BY_OPTIONS,
  useCollectionLayoutStore,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCallback } from 'react';
import CollectionLayoutSortBySelect from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutSortBySelect.tsx';

interface CollectionLayoutSortByProps {}

const CollectionLayoutSortBy: React.FC<CollectionLayoutSortByProps> = ({}) => {
  const { sortBy } = useCollectionLayoutStore();
  const { addSortBy, removeSortBy, changeSortBy } = useCollectionLayoutStoreActions();

  const onValueChange = useCallback(
    (v: CollectionSortBy | undefined, i: number) => {
      if (i === sortBy.length) {
        if (v === undefined) return;
        addSortBy(v);
      } else if (v === undefined) {
        removeSortBy(sortBy[i]);
      } else {
        changeSortBy(v, i);
      }
    },
    [sortBy],
  );

  const options = SORT_BY_OPTIONS.filter(o => !sortBy.includes(o.value));

  return (
    <div className="flex gap-2 items-center">
      <span className="font-bold">Sort by: </span>
      {sortBy.map((g, i) => (
        <CollectionLayoutSortBySelect
          key={`${g}-${i}`}
          index={i}
          options={options}
          value={SORT_BY_OPTIONS.find(go => go.value === g)}
          setValue={onValueChange}
        />
      ))}
      {sortBy.length < SORT_BY_OPTIONS.length && (
        <CollectionLayoutSortBySelect
          key={`last-${sortBy.length}`}
          index={sortBy.length}
          options={options}
          value={undefined}
          setValue={onValueChange}
        />
      )}
    </div>
  );
};

export default CollectionLayoutSortBy;
