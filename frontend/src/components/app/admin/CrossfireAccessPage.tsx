import { useEffect, useState } from 'react';
import { useCrossfireAccess, useSetCrossfireAccess } from '@/api/crossfire-access';
import { useSession } from '@/lib/auth-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CrossfireLogo } from '@/components/app/crossfire/CrossfireLogo';
export function CrossfireAccessPage() {
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const { data: session } = useSession();
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const users = useCrossfireAccess(query),
    update = useSetCrossfireAccess();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <CrossfireLogo className="h-9 w-14" />
        <div>
          <h2 className="text-xl font-semibold">Crossfire access</h2>
          <p className="text-sm text-muted-foreground">
            Grant or revoke Crossfire while keeping each user’s other roles.
          </p>
        </div>
      </div>
      <Input
        aria-label="Search users"
        placeholder="Search by name or email…"
        maxLength={120}
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {update.isError && (
        <p role="alert" className="text-sm text-destructive">
          {update.error.message}
        </p>
      )}
      {users.isPending ? (
        <p role="status">Loading users…</p>
      ) : users.isError ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {users.error.message}
          <Button variant="outline" size="sm" onClick={() => void users.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {users.data.users.map(user => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="font-medium break-words">
                    {user.name}
                    {user.id === session?.user.id && ' (you)'}
                  </div>
                  <div className="text-sm text-muted-foreground break-all">{user.email}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(user.roles.length ? user.roles : ['user']).map(role => (
                      <Badge key={role} variant={role === 'crossfire' ? 'default' : 'secondary'}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={user.enabled ? 'outline' : 'default'}
                  disabled={update.isPending || users.isFetching || search.trim() !== query}
                  aria-label={`${user.enabled ? 'Revoke' : 'Grant'} Crossfire access for ${user.name}`}
                  onClick={() => {
                    setNotice('');
                    update.mutate(
                      { userId: user.id, enabled: !user.enabled },
                      {
                        onSuccess: result =>
                          setNotice(
                            `Crossfire access ${result.enabled ? 'granted to' : 'revoked for'} ${result.name}.`,
                          ),
                      },
                    );
                  }}
                >
                  {update.isPending && update.variables.userId === user.id
                    ? 'Saving…'
                    : user.enabled
                      ? 'Revoke access'
                      : 'Grant access'}
                </Button>
              </li>
            ))}
          </ul>
          {users.data.users.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching users.</p>
          )}
          {users.data.hasMore && (
            <p className="text-sm text-muted-foreground">
              Showing the first 25 users. Narrow your search to find someone else.
            </p>
          )}
        </>
      )}
    </section>
  );
}
