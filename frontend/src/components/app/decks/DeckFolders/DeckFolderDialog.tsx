import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import Dialog from '@/components/app/global/Dialog.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useSaveDeckFolder } from '@/api/deck-folders/useSaveDeckFolder.ts';
import { toast } from '@/hooks/use-toast.ts';
import { getDeckFolderDescendants } from '../../../../../../shared/lib/deckFolders.ts';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';
import DeckFolderSelect from './DeckFolderSelect.tsx';

type Props = {
  folders: DeckFolder[];
  folder?: DeckFolder;
  parentId?: string;
  trigger: React.ReactNode;
  onSaved: (id: string, parentId: string | null) => void;
};

export default function DeckFolderDialog({ folders, folder, parentId, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const save = useSaveDeckFolder();
  const excluded = folder ? getDeckFolderDescendants(folders, folder.id) : new Set<string>();
  const options = folders.filter(item => !excluded.has(item.id));
  const form = useForm({
    defaultValues: { name: folder?.name ?? '', parentId: folder?.parentId ?? parentId ?? '' },
    onSubmit: async ({ value }) => {
      try {
        const parent = value.parentId || null;
        const result = await save.mutateAsync({
          id: folder?.id,
          name: value.name.trim(),
          ...(!folder || parent !== folder.parentId ? { parentId: parent } : {}),
        });
        setOpen(false);
        onSaved(result.id, result.parentId);
        toast({ title: folder ? 'Folder updated' : 'Folder created' });
      } catch {
        // Keep the draft open; the mutation displays the error.
      }
    },
  });
  return (
    <Dialog
      trigger={trigger}
      header={folder ? 'Edit folder' : parentId ? 'New subfolder' : 'New folder'}
      headerDescription="Keep related decks together. Folders can contain decks and subfolders."
      open={open}
      onOpenChange={next => {
        if (!save.isPending) {
          setOpen(next);
          if (next) form.reset();
        }
      }}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={event => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) =>
              !value.trim()
                ? 'Enter a folder name'
                : value.trim().length > 100
                  ? 'Use at most 100 characters'
                  : undefined,
          }}
        >
          {field => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${inputId}-name`}>Folder name</Label>
              <Input
                id={`${inputId}-name`}
                value={field.state.value}
                maxLength={100}
                autoFocus
                disabled={save.isPending}
                onBlur={field.handleBlur}
                onChange={event => field.handleChange(event.target.value)}
                placeholder="e.g. Tournament prep"
              />
              <FormFieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
        <form.Field name="parentId">
          {field =>
            options.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${inputId}-parent`}>Parent folder</Label>
                <DeckFolderSelect
                  id={`${inputId}-parent`}
                  label="Parent folder"
                  emptyLabel="No parent folder"
                  folders={options}
                  className="w-full"
                  value={field.state.value || null}
                  disabled={save.isPending}
                  onChange={id => {
                    field.handleChange(id ?? '');
                    field.handleBlur();
                  }}
                />
              </div>
            )
          }
        </form.Field>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, submitting]) => (
              <Button type="submit" disabled={!canSubmit || submitting || save.isPending}>
                {save.isPending ? 'Saving...' : folder ? 'Save folder' : 'Create folder'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </Dialog>
  );
}
