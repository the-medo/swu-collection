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

export function UserPicker({ onSelect }: { onSelect: (user: UserMention) => void }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
  const users = useEditorUsers(query);
  return (
    <Command shouldFilter={false} className="border">
      <CommandInput
        aria-label="Search users"
        placeholder="Search by display name…"
        value={search}
        onValueChange={setSearch}
        maxLength={80}
        autoFocus
      />
      {search.trim().length < 2 ? (
        <p className="p-4 text-sm text-muted-foreground">Type at least two characters.</p>
      ) : users.isError ? (
        <div className="p-4" role="alert">
          Could not search profiles. <Button onClick={() => void users.refetch()}>Try again</Button>
        </div>
      ) : users.isFetching || query !== search ? (
        <p className="p-4" role="status">
          Searching…
        </p>
      ) : (
        <CommandList>
          <CommandEmpty>No matching profiles.</CommandEmpty>
          {users.data?.map(user => (
            <CommandItem key={user.id} value={user.id} onSelect={() => onSelect(user)}>
              @{user.displayName}
            </CommandItem>
          ))}
        </CommandList>
      )}
    </Command>
  );
}
