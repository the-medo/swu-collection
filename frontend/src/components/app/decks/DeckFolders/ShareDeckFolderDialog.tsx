import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Copy, Link2, Users } from 'lucide-react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { useTeams } from '@/api/teams/useTeams.ts';
import { useShareDeckFolder } from '@/api/deck-folders/useShareDeckFolder.ts';
import { toast } from '@/hooks/use-toast.ts';
import { getDeckFolderSharingSources } from '../../../../../../shared/lib/deckFolders.ts';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';

type Props = { folder: DeckFolder; folders: DeckFolder[]; trigger: React.ReactNode };

export default function ShareDeckFolderDialog({ folder, folders, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const save = useShareDeckFolder();
  return (
    <Dialog
      trigger={trigger}
      header={`Share ${folder.name}`}
      headerDescription="People you share with can view every deck and subfolder, including private decks. They cannot edit them."
      open={open}
      onOpenChange={next => {
        if (!save.isPending) setOpen(next);
      }}
    >
      {open && (
        <SharingForm folder={folder} folders={folders} save={save} onSaved={() => setOpen(false)} />
      )}
    </Dialog>
  );
}

function SharingForm({
  folder,
  folders,
  save,
  onSaved,
}: Omit<Props, 'trigger'> & {
  save: ReturnType<typeof useShareDeckFolder>;
  onSaved: () => void;
}) {
  const id = useId();
  const teams = useTeams();
  const sources = getDeckFolderSharingSources(folders, folder.id);
  const inherited = sources.filter(source => source.id !== folder.id);
  const url = `${window.location.origin}/decks/folder/${folder.id}`;
  const form = useForm({
    defaultValues: {
      linkEnabled: folder.sharing?.linkEnabled ?? false,
      teamIds: folder.sharing?.teams.map(team => team.id) ?? [],
    },
    onSubmit: async ({ value }) => {
      try {
        await save.mutateAsync({ id: folder.id, ...value });
        toast({ title: 'Folder sharing updated' });
        onSaved();
      } catch {
        /* Preserve the draft; the mutation displays the error. */
      }
    },
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {inherited.length > 0 && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Also shared through {inherited.map(source => source.name).join(', ')}. Manage that access
          in the parent folder.
        </p>
      )}
      <form.Field name="linkEnabled">
        {field => (
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Link2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor={`${id}-link`}>Anyone with the link</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                View without signing in. Hidden from public browsing.
              </p>
            </div>
            <Switch
              id={`${id}-link`}
              checked={field.state.value}
              disabled={save.isPending}
              onCheckedChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>
      <div className="rounded-md border p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          Share with teams
        </div>
        {teams.isPending && <p className="text-sm text-muted-foreground">Loading your teams...</p>}
        {teams.isError && (
          <div role="alert" className="text-sm">
            Could not load your teams.
            <Button type="button" variant="ghost" size="sm" onClick={() => void teams.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {teams.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">You aren’t in any teams yet.</p>
        )}
        <form.Field name="teamIds">
          {field => (
            <div className="flex max-h-48 flex-col gap-3 overflow-y-auto">
              {teams.data?.map(team => (
                <label key={team.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.state.value.includes(team.id)}
                    disabled={save.isPending}
                    onCheckedChange={checked =>
                      field.handleChange(
                        checked
                          ? [...field.state.value, team.id]
                          : field.state.value.filter(value => value !== team.id),
                      )
                    }
                  />
                  {team.name}
                </label>
              ))}
            </div>
          )}
        </form.Field>
        <p className="mt-3 text-xs text-muted-foreground">
          Only current members of the selected teams can view. Sharing ends if you leave the team.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-url`}>Folder link</Label>
        <div className="flex gap-2">
          <Input id={`${id}-url`} readOnly value={url} onFocus={event => event.target.select()} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy folder link"
            disabled={!sources.length}
            onClick={() =>
              void navigator.clipboard.writeText(url).then(
                () => toast({ title: 'Folder link copied' }),
                () =>
                  toast({ variant: 'destructive', title: 'Select and copy the folder link above' }),
              )
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        {!sources.length && (
          <p className="text-xs text-muted-foreground">
            Save sharing settings to make this link available.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onSaved}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending || teams.isPending || teams.isError}>
          {save.isPending ? 'Saving...' : 'Save sharing'}
        </Button>
      </div>
    </form>
  );
}
