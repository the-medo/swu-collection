import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useId, useState } from 'react';
import DeckPrivacySelector, {
  DeckPrivacy,
} from '@/components/app/decks/components/DeckPrivacySelector.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Textarea } from '@/components/ui/textarea.tsx';
import { usePostDeck } from '@/api/decks/usePostDeck.ts';
import { useImportDeck } from '@/api/decks/useImportDeck.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { cardFilterByFormatId, formatDataById } from '../../../../../../types/Format.ts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { ImportNewDeck } from '@/components/app/dialogs/NewDeckDialog/ImportNewDeck.tsx';
import { useDeckFolders } from '@/api/deck-folders/useDeckFolders.ts';
import DeckFolderSelect from '@/components/app/decks/DeckFolders/DeckFolderSelect.tsx';
import { Label } from '@/components/ui/label.tsx';

type NewDeckDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'> & {
  initialFolderId?: string | null;
};

const NewDeckDialog: React.FC<NewDeckDialogProps> = ({
  trigger,
  triggerDisabled,
  initialFolderId = null,
}) => {
  const navigate = useNavigate();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const folderInputId = useId();
  const foldersQuery = useDeckFolders(open ? user?.id : undefined);
  const folders = foldersQuery.data ?? [];
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const folderUnavailable =
    foldersQuery.isSuccess && !!folderId && !folders.some(folder => folder.id === folderId);
  const folderBlocked =
    foldersQuery.isPending || (!!folderId && (folderUnavailable || foldersQuery.isError));
  const [selectedLeader1, setSelectedLeader1] = useState<string | undefined>(undefined);
  const [selectedLeader2, setSelectedLeader2] = useState<string | undefined>(undefined);
  const [selectedBase, setSelectedBase] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const postDeckMutation = usePostDeck();
  const importDeckMutation = useImportDeck();
  const busy = postDeckMutation.isPending || importDeckMutation.isPending;

  const form = useForm({
    defaultValues: {
      format: 1,
      name: 'My deck',
      description: '',
      public: 2 as DeckPrivacy,
    },
    onSubmit: async ({ value }) => {
      if (busy || folderBlocked) return;
      // Call our hook's mutation function.
      postDeckMutation.mutate(
        {
          format: value.format,
          name: value.name,
          description: value.description,
          public: value.public,
          leaderCardId1: selectedLeader1,
          leaderCardId2: selectedLeader2,
          baseCardId: selectedBase,
          folderId,
        },
        {
          onSuccess: result => {
            toast({
              title: `Deck "${value.name}" created!`,
            });
            // Navigate to the newly created deck.
            const createdDeck = result.data[0];
            navigate({ to: `/decks/${createdDeck.id}` });
            setOpen(false);
          },
        },
      );
    },
  });

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`New deck`}
      open={open}
      onOpenChange={next => {
        if (busy) return;
        setOpen(next);
        if (next) setFolderId(initialFolderId);
      }}
      contentClassName="md:min-w-[500px]"
    >
      {user ? (
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" disabled={busy}>
              New
            </TabsTrigger>
            <TabsTrigger value="import" disabled={busy}>
              Import
            </TabsTrigger>
          </TabsList>
          {foldersQuery.isPending && (
            <p role="status" className="py-2 text-sm text-muted-foreground">
              Loading folders...
            </p>
          )}
          {(foldersQuery.isError || folderUnavailable) && (
            <div role="alert" className="flex flex-wrap items-center gap-2 py-2 text-sm">
              {folderUnavailable
                ? 'This folder is no longer available.'
                : 'Could not load folders.'}
              {foldersQuery.isError && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={foldersQuery.isFetching || busy}
                  onClick={() => void foldersQuery.refetch()}
                >
                  Try again
                </Button>
              )}
              {folderId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setFolderId(null)}
                >
                  Use No folder
                </Button>
              )}
            </div>
          )}
          <TabsContent value="new">
            <form
              className="flex flex-col gap-4"
              onSubmit={e => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <form.Field
                name="name"
                children={field => (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="text"
                      className=""
                      id={field.name}
                      placeholder="Deck name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
              <form.Field
                name="format"
                children={field => {
                  const selectedFormatFilter = cardFilterByFormatId[Number(field.state.value)];

                  return (
                    <div className="flex flex-col gap-2">
                      <FormatSelect
                        value={field.state.value}
                        allowEmpty={false}
                        onChange={e => field.handleChange(e ?? 1)}
                      />
                      <div className="flex flex-wrap gap-2 w-full justify-center items-center">
                        <LeaderSelector
                          trigger={null}
                          leaderCardId={selectedLeader1}
                          onLeaderSelected={setSelectedLeader1}
                          filterByFormat={selectedFormatFilter}
                        />
                        {formatDataById[Number(field.state.value)]?.leaderCount === 2 && (
                          <LeaderSelector
                            trigger={null}
                            leaderCardId={selectedLeader2}
                            onLeaderSelected={setSelectedLeader2}
                            filterByFormat={selectedFormatFilter}
                          />
                        )}
                        <BaseSelector
                          trigger={null}
                          baseCardId={selectedBase}
                          onBaseSelected={setSelectedBase}
                          filterByFormat={selectedFormatFilter}
                        />
                      </div>
                    </div>
                  );
                }}
              />
              <form.Field
                name="description"
                children={field => (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      className=""
                      id={field.name}
                      placeholder="Description"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
              <form.Field
                name="public"
                children={field => (
                  <DeckPrivacySelector
                    value={field.state.value as DeckPrivacy}
                    onChange={v => field.handleChange(v)}
                  />
                )}
              />
              {folders.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={folderInputId}>Folder</Label>
                  <DeckFolderSelect
                    id={folderInputId}
                    folders={folders}
                    value={folderId}
                    onChange={setFolderId}
                    disabled={postDeckMutation.isPending}
                    className="w-full"
                  />
                </div>
              )}
              <Button type="submit" disabled={busy || folderBlocked}>
                {postDeckMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="import">
            <ImportNewDeck
              onSuccess={() => setOpen(false)}
              folders={folders}
              folderId={folderId}
              onFolderChange={setFolderId}
              importDeck={importDeckMutation}
              folderBlocked={folderBlocked}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex flex-col gap-4">
          Please sign in to create new deck.
          <SignIn />
        </div>
      )}
    </Dialog>
  );
};

export default NewDeckDialog;
