import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { useImportDeck } from '@/api/decks/useImportDeck.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { Label } from '@/components/ui/label.tsx';
import { zDeckImportFormat, zDeckImportRequest } from '../../../../../../types/DeckImport.ts';
import { useId } from 'react';
import DeckFolderSelect from '@/components/app/decks/DeckFolders/DeckFolderSelect.tsx';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';

interface ImportNewDeckProps {
  onSuccess: () => void;
  folders: DeckFolder[];
  folderId: string | null;
  onFolderChange: (id: string | null) => void;
  importDeck: ReturnType<typeof useImportDeck>;
  folderBlocked: boolean;
}

export const ImportNewDeck: React.FC<ImportNewDeckProps> = ({
  onSuccess,
  folders,
  folderId,
  onFolderChange,
  importDeck,
  folderBlocked,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const folderInputId = useId();

  const form = useForm({
    defaultValues: {
      deckLink: '',
      format: null as number | null,
    },
    onSubmit: async ({ value }) => {
      const request = zDeckImportRequest.safeParse({ ...value, folderId });
      if (!request.success || importDeck.isPending || folderBlocked) return;
      importDeck.mutate(request.data, {
        onSuccess: result => {
          if (!('data' in result)) return;
          const createdDeck = result.data.deck;
          const errors = result.data.errors;

          if (errors.length > 0) {
            toast({
              title: 'Not all cards are imported',
              description: createdDeck.description,
            });
          } else {
            toast({
              title: `Deck "${createdDeck.name}" created!`,
            });
          }
          navigate({ to: `/decks/${createdDeck.id}` });
          onSuccess();
        },
      });
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="deckLink"
        validators={{
          onChange: ({ value }) =>
            zDeckImportRequest.shape.deckLink.safeParse(value).error?.issues[0]?.message,
        }}
        children={field => (
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-deck-link">Deck link</Label>
            <Input
              type="text"
              id="import-deck-link"
              placeholder="Deck link (SWUDB, SWU Forge, Melee, HoloScan, or Protect the Pod)"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
            />
            <FormFieldError meta={field.state.meta} />
          </div>
        )}
      />
      <form.Field
        name="format"
        validators={{
          onChange: ({ value }) => zDeckImportFormat.safeParse(value).error?.issues[0]?.message,
        }}
        children={field => (
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-deck-format">Format (required)</Label>
            <FormatSelect
              id="import-deck-format"
              aria-describedby="import-deck-format-help"
              value={field.state.value}
              allowEmpty={false}
              onChange={field.handleChange}
            />
            <p id="import-deck-format-help" className="text-sm text-muted-foreground">
              Each deckbuilder handles formats differently, so choose the format you want to use in
              SWUBase. This choice will be kept when you refresh the deck.
            </p>
            <FormFieldError meta={field.state.meta} />
          </div>
        )}
      />
      {folders.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={folderInputId}>Folder</Label>
          <DeckFolderSelect
            id={folderInputId}
            folders={folders}
            value={folderId}
            onChange={onFolderChange}
            disabled={importDeck.isPending}
            className="w-full"
          />
        </div>
      )}
      <form.Subscribe
        selector={state => [state.canSubmit, state.isSubmitting, state.values] as const}
      >
        {([canSubmit, isSubmitting, values]) => (
          <Button
            type="submit"
            disabled={
              !canSubmit ||
              isSubmitting ||
              importDeck.isPending ||
              folderBlocked ||
              !values.deckLink.trim() ||
              values.format === null
            }
          >
            {importDeck.isPending ? 'Importing...' : 'Import'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
};
