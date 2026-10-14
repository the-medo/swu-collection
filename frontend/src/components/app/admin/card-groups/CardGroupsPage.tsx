import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCardGroups } from '@/api/card-groups/useCardGroups.ts';
import { useDeleteCardGroup } from '@/api/card-groups/useDeleteCardGroup.ts';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog.tsx';
import type { CardGroup } from '../../../../../../types/CardGroup.ts';
import CardGroupForm from './CardGroupForm.tsx';

export default function CardGroupsPage() {
  const query = useCardGroups(true);
  const remove = useDeleteCardGroup();
  const [editing, setEditing] = useState<{
    saved: CardGroup | null;
    initialPosition: number;
  } | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Card groups</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Curate exact card versions into galleries. Published groups appear on the Promo and
            special cards page, with higher positions first.
          </p>
        </div>
        <Button
          disabled={
            editing !== null ||
            query.isPending ||
            query.isFetching ||
            query.isError ||
            remove.isPending
          }
          onClick={async () => {
            const latest = await query.refetch();
            if (!latest.data || latest.isError) return;
            setEditing({
              saved: null,
              initialPosition:
                latest.data.reduce((highest, group) => Math.max(highest, group.sortOrder), 0) + 100,
            });
            setSavedMessage('');
          }}
        >
          <Plus className="mr-2 size-4" />
          New group
        </Button>
      </header>
      {savedMessage && (
        <p role="status" className="text-sm text-muted-foreground">
          {savedMessage}
        </p>
      )}
      {editing !== null && (
        <CardGroupForm
          key={editing.saved?.id ?? 'new'}
          saved={editing.saved}
          initialPosition={editing.initialPosition}
          onSaved={() => {
            setEditing(null);
            setSavedMessage('Card group saved.');
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {query.isPending && <p role="status">Loading card groups…</p>}
      {query.isError && (
        <div role="alert">
          {query.error.message}{' '}
          <Button variant="link" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {remove.error && (
        <p role="alert" className="text-sm text-destructive">
          {remove.error.message}
        </p>
      )}
      {query.data?.length === 0 && editing === null && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">Your first collection of cards</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a group for special promos, favorite artwork, or any versions you want people to
            discover.
          </p>
        </div>
      )}
      <div className="space-y-3">
        {query.data?.map(group => (
          <article
            key={group.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
          >
            <div className="min-w-0 flex-1 basis-48">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-semibold">{group.title}</h3>
                <Badge variant={group.published ? 'default' : 'secondary'}>
                  {group.published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">{group.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Position {group.sortOrder} · {group.variantIds.length} versions
              </p>
            </div>
            {group.published && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cards/groups/$groupId" params={{ groupId: group.id }}>
                  View gallery
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={editing !== null || query.isFetching}
              onClick={() => {
                setEditing({ saved: group, initialPosition: group.sortOrder });
                setSavedMessage('');
              }}
            >
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={remove.isPending || editing !== null || query.isFetching}
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{group.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the group and its gallery link. The cards themselves are kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate(group.id)}>
                    Delete group
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </article>
        ))}
      </div>
    </div>
  );
}
