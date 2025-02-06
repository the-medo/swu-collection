import {
  CollectionGroupBy,
  GROUP_BY_OPTIONS,
  useCollectionLayoutStore,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';
import CollectionLayoutGroupBySelect from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/CollectionLayoutGroupBySelect.tsx';
import { useCallback } from 'react';

interface CollectionLayoutGroupByProps {}

const CollectionLayoutGroupBy: React.FC<CollectionLayoutGroupByProps> = ({}) => {
  const { groupBy } = useCollectionLayoutStore();
  const { addGroupBy, removeGroupBy, changeGroupBy } = useCollectionLayoutStoreActions();

  const onValueChange = useCallback(
    (v: CollectionGroupBy | undefined, i: number) => {
      if (i === groupBy.length) {
        if (v === undefined) return;
        addGroupBy(v);
      } else if (v === undefined) {
        removeGroupBy(groupBy[i]);
      } else {
        changeGroupBy(v, i);
      }
    },
    [groupBy],
  );

  const options = GROUP_BY_OPTIONS.filter(o => !groupBy.includes(o.value));

  return (
    <div className="flex gap-2 items-center">
      <span className="font-bold">Group by: </span>
      {groupBy.map((g, i) => (
        <CollectionLayoutGroupBySelect
          key={`${g}-${i}`}
          index={i}
          options={options}
          value={GROUP_BY_OPTIONS.find(go => go.value === g)}
          setValue={onValueChange}
        />
      ))}
      {groupBy.length < GROUP_BY_OPTIONS.length && (
        <CollectionLayoutGroupBySelect
          index={groupBy.length}
          options={options}
          value={undefined}
          setValue={onValueChange}
        />
      )}
    </div>
  );
};

export default CollectionLayoutGroupBy;
