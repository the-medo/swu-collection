import * as React from 'react';
import {
  useComparerStore,
  useComparerStoreActions,
} from '@/components/app/comparer/useComparerStore';
import ComparerEntryBadge from '@/components/app/comparer/SidebarComparer/ComparerEntryBadge.tsx';

const SidebarComparer: React.FC = () => {
  const { entries, mainId } = useComparerStore();
  const { setMainId, removeComparerEntry } = useComparerStoreActions();

  return (
    <div className="p-1">
      <div className="flex flex-col gap-2 p-2 rounded-lg border-foreground dark:border-primary border-dashed border bg-accent/70">
        <div className="w-full flex flex-wrap gap-1">
          {entries.length === 0 && (
            <span className="text-xs italic text-secondary-foreground/70">No entries</span>
          )}
          {entries
            .sort((a, b) => {
              if (a.id === mainId) return -1;
              if (b.id === mainId) return 1;
              return 0;
            })
            .map(entry => (
              <ComparerEntryBadge
                key={entry.id}
                entry={entry}
                isMain={entry.id === mainId}
                onRemove={() => removeComparerEntry(entry.id)}
                onSetMain={() => setMainId(entry.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SidebarComparer;
