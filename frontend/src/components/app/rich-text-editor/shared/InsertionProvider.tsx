import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.tsx';
import { CardImagePicker } from './CardImagePicker.tsx';
import { CardPicker } from './CardPicker.tsx';
import { DeckPicker } from './DeckPicker.tsx';
import { InsertionContext } from './insertionContext.ts';
import { UserPicker } from './UserPicker.tsx';
import { WidgetPicker } from './WidgetPicker.tsx';
import { editorCommands, widgetSchema } from './model.ts';
import type { InsertKind, Insertion } from './model.ts';

export function InsertionProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<InsertKind | null>(null);
  const [initial, setInitial] = useState<Insertion | undefined>();
  const [generation, setGeneration] = useState(0);
  const [open, setOpen] = useState(false);
  const pending = useRef<((value: Insertion | null) => void) | null>(null);
  const request = useCallback(
    (next: InsertKind, value?: Insertion) =>
      new Promise<Insertion | null>(resolve => {
        pending.current?.(null);
        pending.current = resolve;
        setKind(next);
        setInitial(value);
        setGeneration(n => n + 1);
        setOpen(true);
      }),
    [],
  );
  const finish = (value: Insertion | null) => {
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
          className="max-h-[90dvh] max-w-3xl overflow-y-auto"
          onCloseAutoFocus={event => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {kind === 'mention'
                ? 'Mention a user'
                : `${initial ? 'Edit' : 'Insert'} ${editorCommands.find(c => c.id === kind)?.label.toLowerCase() ?? 'content'}`}
            </DialogTitle>
            <DialogDescription>
              {kind === 'mention'
                ? 'Search a public profile. Mentions create links and do not send notifications.'
                : kind === 'decklist'
                  ? 'Choose a deck or paste a SWUBASE deck link.'
                  : kind === 'card-image' || kind === 'card-link'
                    ? 'Search the SWUBASE catalog. Use arrow keys and Enter to choose a card.'
                    : 'Configure your widget and insert it into the document.'}
            </DialogDescription>
          </DialogHeader>
          <div key={generation}>
            {kind === 'decklist' ? (
              <DeckPicker onSelect={deck => finish({ kind: 'decklist', deck })} />
            ) : kind === 'card-image' ? (
              <CardImagePicker
                initial={initial?.kind === 'card-image' ? initial : undefined}
                onSelect={finish}
              />
            ) : kind === 'card-link' ? (
              <CardPicker onSelect={card => finish({ kind, card })} />
            ) : kind === 'mention' ? (
              <UserPicker onSelect={user => finish({ kind: 'mention', user })} />
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
