import { lazy, Suspense, useState, useId } from 'react';
import { Check, Plus, ChevronDown, Crown, Shield, Swords, X } from 'lucide-react';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { cn } from '@/lib/utils.ts';
import {
  emptyPostDocument,
  postDocumentSchemas,
  postPlainText,
} from '../../../../../../shared/posts/content.ts';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { PickerBody, PickerFooter } from './PickerLayout.tsx';
import { Button } from '@/components/ui/button.tsx';
import { widgetSchema, type Widget } from './model.ts';

const PostEditor = lazy(() => import('../blocknote/BlocknoteEditor.tsx'));

export function MatchupPicker({
  initial,
  onSelect,
}: {
  initial?: Extract<Widget, { kind: 'matchup' }>;
  onSelect: (value: Widget) => void;
}) {
  const kind = 'matchup';
  const fieldId = useId();
  const [title, setTitle] = useState(initial?.title ?? 'Matchup plan');
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '');
  const [footer, setFooter] = useState(initial?.footer ?? '');
  const [notes, setNotes] = useState(() => initial?.notes ?? emptyPostDocument());
  const [matchup, setMatchup] = useState<
    Pick<
      Extract<Widget, { kind: 'matchup' }>,
      'leftLeader' | 'leftBase' | 'rightLeader' | 'rightBase'
    >
  >(initial ?? {});
  const catalog = useCardList();
  const parsed = widgetSchema.safeParse({ ...matchup, kind, title, subtitle, notes, footer });
  const notesValidation = postDocumentSchemas.comments.safeParse(notes);
  const notesLength = notesValidation.success ? postPlainText(notesValidation.data).length : 0;

  const guidance = !parsed.success
    ? 'Add matchup notes to continue. Leaders and bases are optional.'
    : initial
      ? 'Changes apply to this block when you save.'
      : 'You can edit this block again after inserting it.';
  return (
    <>
      <PickerBody>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['left', 'right'] as const).map(side => (
            <fieldset key={side} className="min-w-0 rounded-xl border bg-card">
              <legend className="ml-3 px-2 text-xs font-semibold">
                {side === 'left' ? 'Your deck' : 'Opponent'}
              </legend>
              <div
                className={cn(
                  'flex h-24 items-center justify-between gap-3 border-b bg-muted/20 px-4',
                  side === 'right' && 'flex-row-reverse',
                )}
              >
                <DeckArtwork leaderId={matchup[`${side}Leader`]} baseId={matchup[`${side}Base`]} />
                <span className="rounded-full border bg-background p-2 text-muted-foreground">
                  <Swords className="size-4" aria-hidden />
                </span>
              </div>
              <div className="space-y-2 p-3">
                <LeaderSelector
                  leaderCardId={matchup[`${side}Leader`] || undefined}
                  onLeaderSelected={value =>
                    setMatchup(prev => ({ ...prev, [`${side}Leader`]: value }))
                  }
                  trigger={
                    <Button
                      variant="outline"
                      className="h-auto min-h-11 w-full justify-start rounded-lg text-left whitespace-normal"
                      aria-label={`${side} leader`}
                    >
                      <Crown className="shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {catalog.data?.cards[matchup[`${side}Leader`] ?? '']?.name ??
                          'Choose leader (optional)'}
                      </span>
                      <ChevronDown className="shrink-0 text-muted-foreground" aria-hidden />
                    </Button>
                  }
                />
                <BaseSelector
                  baseCardId={matchup[`${side}Base`] || undefined}
                  onBaseSelected={value =>
                    setMatchup(prev => ({ ...prev, [`${side}Base`]: value }))
                  }
                  trigger={
                    <Button
                      variant="outline"
                      className="h-auto min-h-11 w-full justify-start rounded-lg text-left whitespace-normal"
                      aria-label={`${side} base`}
                    >
                      <Shield className="shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {catalog.data?.cards[matchup[`${side}Base`] ?? '']?.name ??
                          'Choose base (optional)'}
                      </span>
                      <ChevronDown className="shrink-0 text-muted-foreground" aria-hidden />
                    </Button>
                  }
                />
                <div className="flex flex-wrap gap-1">
                  {(['Leader', 'Base'] as const).map(type =>
                    matchup[`${side}${type}`] ? (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        aria-label={`Remove ${side} ${type.toLowerCase()}`}
                        onClick={() =>
                          setMatchup(prev => ({ ...prev, [`${side}${type}`]: undefined }))
                        }
                      >
                        <X aria-hidden />
                        Remove {type.toLowerCase()}
                      </Button>
                    ) : null,
                  )}
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2 text-xs font-medium">
            <label htmlFor={`${fieldId}-title`}>Title</label>
            <Input
              id={`${fieldId}-title`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Give this moment a title"
            />
          </div>

          <div className="grid gap-2 text-xs font-medium">
            <label htmlFor={`${fieldId}-subtitle`}>
              Subtitle <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id={`${fieldId}-subtitle`}
              aria-label="Subtitle"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              maxLength={240}
              placeholder="On the play · post-sideboard"
            />
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium">Matchup notes</p>
          <Suspense fallback={<p role="status">Loading notes editor…</p>}>
            <PostEditor
              type="comments"
              ariaLabel="Matchup notes"
              initialContent={notes}
              onChange={setNotes}
            />
          </Suspense>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>Format text, type / for a card link, or @ to mention a player.</span>
            <span>{notesLength.toLocaleString()} / 5,000</span>
          </div>
          {!notesValidation.success && (
            <p role="alert" className="text-xs text-destructive">
              {notesValidation.error.issues[0]?.message}
            </p>
          )}
          {notesLength > 5000 && (
            <p role="alert" className="text-xs text-destructive">
              Use at most 5,000 characters.
            </p>
          )}
        </div>

        <div className="grid gap-2 text-xs font-medium">
          <label htmlFor={`${fieldId}-footer`}>
            Footer <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id={`${fieldId}-footer`}
            value={footer}
            onChange={e => setFooter(e.target.value)}
            className="resize-y rounded-xl text-sm leading-relaxed"
            rows={2}
            maxLength={1000}
            placeholder="A closing note, result, or source…"
          />
          <p className="font-normal text-muted-foreground">
            Appears below your notes in smaller, muted text.
          </p>
        </div>
      </PickerBody>
      <PickerFooter hint={guidance}>
        <Button
          disabled={!parsed.success}
          onClick={() => {
            if (parsed.success) onSelect(parsed.data);
          }}
        >
          {initial ? <Check aria-hidden /> : <Plus aria-hidden />}
          {initial ? 'Save changes' : 'Insert matchup'}
        </Button>
      </PickerFooter>
    </>
  );
}
