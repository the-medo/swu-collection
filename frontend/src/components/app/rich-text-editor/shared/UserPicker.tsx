import { useEffect, useState } from 'react';
import { useEditorUsers } from '@/api/rich-text-editor/useEditorUsers.ts';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { UserMention } from './model.ts';
import { ArrowUpRight, AtSign } from 'lucide-react';
import { PickerNotice } from './PickerLayout.tsx';

export function UserPicker({ onSelect }: { onSelect: (user: UserMention) => void }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
  const users = useEditorUsers(query);
  return (
    <Command shouldFilter={false} className="rte-picker-command rounded-xl border shadow-sm">
      <CommandInput
        aria-label="Search users"
        placeholder="Search by display name…"
        value={search}
        onValueChange={setSearch}
        maxLength={80}
        autoFocus
      />
      {search.trim().length < 2 ? (
        <PickerNotice title="Who would you like to mention?" icon={AtSign}>
          Type at least two characters of a player's display name.
        </PickerNotice>
      ) : users.isError ? (
        <PickerNotice title="Could not search profiles." error>
          <Button className="mt-2" variant="outline" onClick={() => void users.refetch()}>
            Try again
          </Button>
        </PickerNotice>
      ) : users.isFetching || query !== search ? (
        <PickerNotice title="Searching profiles…" loading />
      ) : (
        <CommandList className="max-h-[min(360px,45dvh)] p-2">
          <CommandEmpty>
            <PickerNotice title="No matching profiles">Try another display name.</PickerNotice>
          </CommandEmpty>
          {users.data?.map(user => (
            <CommandItem
              key={user.id}
              value={user.id}
              aria-label={`@${user.displayName}`}
              className="gap-3 p-3"
              onSelect={() => onSelect(user)}
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted/50 text-sm font-semibold"
              >
                {user.displayName.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold">@{user.displayName}</span>
                <span className="text-xs text-muted-foreground">SWUBASE player</span>
              </span>
              <ArrowUpRight className="rte-picker-arrow text-muted-foreground" aria-hidden />
            </CommandItem>
          ))}
        </CommandList>
      )}
    </Command>
  );
}
