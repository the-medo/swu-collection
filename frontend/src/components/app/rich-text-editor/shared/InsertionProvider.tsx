import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.tsx';
import { CardPicker } from './CardPicker.tsx';
import { DeckPicker } from './DeckPicker.tsx';
import { AlbumPicker } from './AlbumPicker.tsx';
import { PoolPicker } from './PoolPicker.tsx';
import { InsertionContext } from './insertionContext.ts';
import { UserPicker } from './UserPicker.tsx';
import { WidgetPicker } from './WidgetPicker.tsx';
import { widgetSchema } from './model.ts';
import { editorCommands, commandDialogTitle } from './commands.ts';
import type { InsertKind, Insertion, EditorInsertion } from './model.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { EditorCommandIcon } from './EditorCommandIcon.tsx';
import { PickerBody, PickerFooter } from './PickerLayout.tsx';
import './insertion-dialog.css';

export function InsertionProvider({ children }: { children: ReactNode }) {
  const catalog = useCardList();
  const [error, setError] = useState<string>();
  const [kind, setKind] = useState<InsertKind | null>(null);
  const [initial, setInitial] = useState<Insertion | undefined>();
  const [generation, setGeneration] = useState(0);
  const [open, setOpen] = useState(false);
  const pending = useRef<((value: EditorInsertion | null) => void) | null>(null);
  const request = useCallback(
    (next: InsertKind, value?: Insertion) =>
      new Promise<EditorInsertion | null>(resolve => {
        pending.current?.(null);
        pending.current = resolve;
        setKind(next);
        setError(undefined);
        setInitial(value);
        setGeneration(n => n + 1);
        setOpen(true);
      }),
    [],
  );
  const finish = (value: EditorInsertion | null) => {
    const resolve = pending.current;
    pending.current = null;
    setOpen(false);
    // Let the dialog release its focus trap before restoring the editor selection.
    requestAnimationFrame(() => resolve?.(value));
  };
  useEffect(() => () => pending.current?.(null), []);
  return (
    <InsertionContext.Provider value={request}>
      {children}
      <Dialog
        open={open}
        onOpenChange={open => {
          if (!open) finish(null);
        }}
      >
        <DialogContent
          className="rte-insertion-dialog flex max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl"
          onCloseAutoFocus={event => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-0 border-b bg-muted/30 p-5 text-left sm:p-6">
            <div className="flex items-start gap-4 pr-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10">
                {kind && <EditorCommandIcon kind={kind} className="size-5" />}
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  SWUBASE editor
                </p>
                <DialogTitle className="rte-insertion-title">
                  {kind && commandDialogTitle(kind, !!initial)}
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed sm:text-sm">
                  {kind && editorCommands[kind].dialogDescription}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div key={generation} className="flex min-h-0 flex-1 flex-col">
            {error && (
              <p
                role="alert"
                className="mx-5 mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {kind === 'decklist' ? (
              <DeckPicker onSelect={deck => finish({ kind: 'decklist', deck })} />
            ) : kind === 'pool' ? (
              <PoolPicker
                initialId={initial?.kind === 'pool' ? initial.poolId : undefined}
                onSelect={poolId => finish({ kind: 'pool', poolId })}
              />
            ) : kind === 'album' ? (
              <AlbumPicker
                initialId={initial?.kind === 'album' ? initial.albumId : undefined}
                onSelect={albumId => finish({ kind: 'album', albumId })}
              />
            ) : kind === 'card-image' ? (
              <>
                <PickerBody>
                  <CardPicker
                    onSelect={card => {
                      const variant = catalog.data?.cards[card.cardId]?.variants[card.variantId];
                      const url = getCardImageUrl(variant?.image.front);
                      if (!url) {
                        setError('This card has no available image. Choose another card.');
                        return;
                      }
                      finish({
                        kind: 'image',
                        props: {
                          url,
                          name: card.name,
                          caption: '',
                          showPreview: true,
                          textAlignment: 'left',
                          previewWidth: variant?.front?.horizontal ? 392 : 200,
                        },
                      });
                    }}
                  />
                </PickerBody>
                <PickerFooter hint="Choose a card to insert its artwork." />
              </>
            ) : kind === 'card-link' ? (
              <>
                <PickerBody>
                  <CardPicker onSelect={card => finish({ kind, card })} />
                </PickerBody>
                <PickerFooter hint="Choose a card to insert a link at your cursor." />
              </>
            ) : kind === 'mention' ? (
              <>
                <PickerBody>
                  <UserPicker onSelect={user => finish({ kind: 'mention', user })} />
                </PickerBody>
                <PickerFooter hint="Choose a player to insert their mention." />
              </>
            ) : (
              kind && (
                <WidgetPicker
                  kind={kind}
                  initial={widgetSchema.safeParse(initial).data}
                  onSelect={finish}
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </InsertionContext.Provider>
  );
}
