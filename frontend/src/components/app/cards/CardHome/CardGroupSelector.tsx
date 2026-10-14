import { useId } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type { CardGroup } from '../../../../../../types/CardGroup.ts';

export default function CardGroupSelector({
  groups,
  value,
  loading,
  error,
  onValueChange,
}: {
  groups: CardGroup[];
  value?: string;
  loading: boolean;
  error: boolean;
  onValueChange: (id: string | undefined) => void;
}) {
  const labelId = useId();
  const valueId = useId();
  const selected = groups.find(group => group.id === value);

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={id => onValueChange(id === 'all' ? undefined : id)}
      disabled={loading || (!groups.length && !value)}
    >
      <SelectTrigger
        aria-labelledby={`${labelId} ${valueId}`}
        className="h-12 w-full min-w-0 gap-3 rounded-xl border-amber-500/30 bg-card px-4 shadow-sm transition-colors hover:border-amber-500/60 sm:w-80 lg:w-96"
      >
        <span id={labelId} className="sr-only">Choose a card group</span>
        {loading ? (
          <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Layers aria-hidden="true" className="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
        )}
        <span id={valueId} className="min-w-0 flex-1 truncate text-left font-medium">
          <SelectValue>
            {loading
              ? 'Loading card groups…'
              : error
                ? 'Could not load card groups'
                : value
                  ? (selected?.title ?? 'Unavailable card group')
                  : groups.length
                    ? 'Browse all groups'
                    : 'No card groups available'}
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent
        align="start"
        className="max-w-[calc(100vw-2rem)] rounded-xl border-amber-500/20 shadow-xl"
      >
        <SelectItem value="all" className="rounded-lg py-3">
          Browse all groups
        </SelectItem>
        <SelectSeparator />
        {groups.map(group => (
          <SelectItem
            key={group.id}
            value={group.id}
            textValue={group.title}
            className="rounded-lg py-3 [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
          >
            <span className="flex min-w-0 items-center justify-between gap-4">
              <span className="min-w-0 break-words">{group.title}</span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {group.variantIds.length}
                <span className="sr-only"> card versions</span>
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
