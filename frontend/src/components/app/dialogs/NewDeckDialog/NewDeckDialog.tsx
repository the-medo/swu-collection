import { dialogStyles } from '@/components/ui/dialogStyles';
import { cn } from '@/lib/utils';
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
import { Castle, Crown, Plus, Download, type LucideIcon } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';

type NewDeckDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'> & {
  initialFolderId?: string | null;
};

const NewDeckDialog: React.FC<NewDeckDialogProps> = ({
  trigger,
  triggerDisabled,
  initialFolderId = null,
}) => {
  const { data: cardList } = useCardList();
  const inputId = useId();
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

  const cardChoice = (label: string, cardId: string | undefined, Icon: LucideIcon) => {
    const card = cardId ? cardList?.cards[cardId] : undefined;
    return (
      <Button type="button" variant="outline" aria-label={`Choose ${label.toLowerCase()}`}>
        {card ? (
          <CardImage
            card={card}
            cardVariantId={selectDefaultVariant(card)}
            size="w50"
            forceHorizontal
            backSideButton={false}
          />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dialog-soft)] text-[var(--dialog-accent)]">
            <Icon />
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-normal text-muted-foreground">{label}</span>
          <span className="text-sm [overflow-wrap:anywhere]">{card?.title ?? 'Choose a card'}</span>
        </span>
      </Button>
    );
  };

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header="New deck"
      headerDescription="Start a new build or bring in a deck you already play."
      open={open}
      onOpenChange={next => {
        if (busy) return;
        setOpen(next);
        if (next) setFolderId(initialFolderId);
      }}
      contentClassName="max-w-[640px]"
    >
      {user ? (
        <Tabs defaultValue="new" className="w-full">
          <TabsList className={cn('grid w-full grid-cols-2', dialogStyles.choiceTabs)}>
            <TabsTrigger value="new" disabled={busy}>
              <Plus className="mr-2 size-4" /> Build a deck
            </TabsTrigger>
            <TabsTrigger value="import" disabled={busy}>
              <Download className="mr-2 size-4" /> Import deck
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
              className={dialogStyles.form}
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
                    <Label htmlFor={`${inputId}-name`}>Deck name</Label>
                    <Input
                      type="text"
                      id={`${inputId}-name`}
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
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`${inputId}-format`}>Format</Label>
                        <FormatSelect
                          id={`${inputId}-format`}
                          value={field.state.value}
                          allowEmpty={false}
                          onChange={e => field.handleChange(e ?? 1)}
                        />
                      </div>
                      <fieldset className="min-w-0">
                        <legend className="mb-3 text-sm font-medium">
                          Leader &amp; base{' '}
                          <span className="font-normal text-muted-foreground">(optional)</span>
                        </legend>
                        <div className={dialogStyles.cardChoices}>
                          <LeaderSelector
                            trigger={cardChoice('Leader', selectedLeader1, Crown)}
                            leaderCardId={selectedLeader1}
                            onLeaderSelected={setSelectedLeader1}
                            filterByFormat={selectedFormatFilter}
                          />
                          {formatDataById[Number(field.state.value)]?.leaderCount === 2 && (
                            <LeaderSelector
                              trigger={cardChoice('Second leader', selectedLeader2, Crown)}
                              leaderCardId={selectedLeader2}
                              onLeaderSelected={setSelectedLeader2}
                              filterByFormat={selectedFormatFilter}
                            />
                          )}
                          <BaseSelector
                            trigger={cardChoice('Base', selectedBase, Castle)}
                            baseCardId={selectedBase}
                            onBaseSelected={setSelectedBase}
                            filterByFormat={selectedFormatFilter}
                          />
                        </div>
                      </fieldset>
                    </div>
                  );
                }}
              />
              <form.Field
                name="description"
                children={field => (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`${inputId}-description`}>
                      Description{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id={`${inputId}-description`}
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
                  <fieldset className="flex min-w-0 flex-col gap-2">
                    <legend className="mb-2 text-sm font-medium">Visibility</legend>
                    <DeckPrivacySelector
                      className={dialogStyles.visibility}
                      value={field.state.value as DeckPrivacy}
                      onChange={v => field.handleChange(v)}
                    />
                    <p className="m-0 text-xs leading-relaxed text-muted-foreground">
                      {field.state.value === 0
                        ? 'Only you can view this deck.'
                        : field.state.value === 1
                          ? 'Anyone can find this deck in public browsing.'
                          : 'Anyone with the link can view it. It stays out of public browsing.'}
                    </p>
                  </fieldset>
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
              <div className={dialogStyles.formActions}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || folderBlocked}>
                  {postDeckMutation.isPending ? 'Creating...' : 'Create deck'}
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="import">
            <ImportNewDeck
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
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
