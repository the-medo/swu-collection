import { cn } from '@/lib/utils.ts';
import MetaPartSelector, {
  type DailySnapshotMetaPart,
} from '../MetaShareTwoWeeks/MetaPartSelector.tsx';
import MetaViewSelector, {
  type DailySnapshotMetaView,
} from '../MetaShareTwoWeeks/MetaViewSelector.tsx';

export default function MetaFilters({
  metaPart,
  setMetaPart,
  metaView,
  setMetaView,
}: {
  metaPart: DailySnapshotMetaPart;
  setMetaPart: (value: DailySnapshotMetaPart) => void;
  metaView: DailySnapshotMetaView;
  setMetaView: (value: DailySnapshotMetaView) => void;
}) {
  return (
    <div
      className={cn(
        'meta-filters flex justify-between items-center flex-wrap gap-2',
        '[&_.meta-filter-group]:gap-0.5 [&_.meta-filter-group]:p-[3px] [&_.meta-filter-group]:border',
        '[&_.meta-filter-group]:border-solid [&_.meta-filter-group]:border-border',
        '[&_.meta-filter-group]:rounded-[11px] [&_.meta-filter-group]:bg-background/70',
        '[&_button]:h-7.5 [&_button]:min-w-0 [&_button]:py-0 [&_button]:px-[11px] [&_button]:rounded-[8px]',
        '[&_button]:text-muted-foreground [&_button]:text-[12px] [&_button]:font-medium',
        '[&_button[data-state=on]]:bg-[var(--meta-accent)] [&_button[data-state=on]]:text-card',
        '[&_button[data-state=on]]:shadow-[0_1px_3px_hsl(var(--foreground)_/_0.1)]',
        '[&_button[data-state=off]:hover]:bg-[var(--meta-tint)]',
        '[&_button[data-state=off]:hover]:text-[color:var(--meta-accent)]',
        'max-tablet-small:[&_button]:px-[9px]',
      )}
    >
      <MetaPartSelector
        value={metaPart}
        onChange={setMetaPart}
        ariaLabel="Results to compare"
        className="meta-filter-group"
      />
      <MetaViewSelector
        value={metaView}
        onChange={setMetaView}
        ariaLabel="Group decks by"
        className="meta-filter-group"
      />
    </div>
  );
}
