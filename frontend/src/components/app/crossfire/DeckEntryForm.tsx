import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useDeckReadiness } from '@/api/crossfire/useDeckReadiness.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type { CrossfirePolicy } from '../../../../../shared/types/crossfire.ts';
import { linkedId, crossfireError, issueLabel, words } from './presentation.ts';

export function PolicySummary({ policy }: { policy: CrossfirePolicy }) {
  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      <li>
        Spectators: {policy.allowSpectators ? 'allowed with the invitation link' : 'disabled'}
      </li>
      <li>
        Hands for players: {policy.handsToPlayers ? 'both hands revealed' : 'only your own hand'}
      </li>
      <li>Hands for spectators: {policy.handsToSpectators ? 'may view both hands' : 'hidden'}</li>
    </ul>
  );
}
export function DeckEntryForm({
  userId,
  sessionId,
  initialDeck,
  bestOf,
  policy,
  pending,
  error,
  submit,
}: {
  userId: string;
  sessionId: string;
  initialDeck?: string;
  bestOf?: 1 | 3;
  policy?: CrossfirePolicy;
  pending: boolean;
  error: unknown;
  submit: (deckId: string, policy: CrossfirePolicy, bestOf: 1 | 3) => Promise<unknown>;
}) {
  const decks = useGetDecks({ userId });
  const { data: catalog } = useCardList();
  const form = useForm({
    defaultValues: {
      deckInput: initialDeck ?? '',
      bestOfThree: bestOf === 3,
      consent: false,
      allowSpectators: true,
      handsToPlayers: false,
      handsToSpectators: false,
    },
    onSubmit: async ({ value }) => {
      const deckId = linkedId(value.deckInput, 'decks');
      if (!deckId || !readiness.data?.ready || readiness.isFetching || (policy && !value.consent))
        return;
      try {
        await submit(
          deckId,
          policy ?? {
            allowSpectators: value.allowSpectators,
            handsToPlayers: value.handsToPlayers,
            handsToSpectators: value.allowSpectators && value.handsToSpectators,
          },
          bestOf ?? (value.bestOfThree ? 3 : 1),
        );
      } catch {
        /* The mutation owns the visible error. */
      }
    },
  });
  const values = useStore(form.store, state => state.values);
  const deckId = linkedId(values.deckInput, 'decks');
  const readiness = useDeckReadiness(sessionId, deckId);
  const rows = decks.data?.pages.flatMap(p => p.data ?? []) ?? [];
  return (
    <form
      className="space-y-5"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        <legend className="mb-3 font-medium">Choose your SWUBASE deck</legend>
        <form.Field name="deckInput">
          {field => (
            <div className="space-y-2">
              <Select
                value={rows.some(row => row.deck.id === field.state.value) ? field.state.value : ''}
                onValueChange={value => {
                  if (value) field.handleChange(value);
                }}
                disabled={pending}
              >
                <SelectTrigger aria-label="Your decks">
                  <SelectValue
                    placeholder={decks.isPending ? 'Loading your decks…' : 'Choose from your decks'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {rows.map(row => (
                    <SelectItem key={row.deck.id} value={row.deck.id}>
                      {row.deck.name || 'Untitled deck'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {decks.hasNextPage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={decks.isFetchingNextPage}
                  onClick={() => void decks.fetchNextPage()}
                >
                  Load more decks
                </Button>
              )}
              {decks.isError && (
                <p className="text-sm text-muted-foreground">
                  Your deck list could not load. You can still paste a deck link below.
                </p>
              )}
              {!decks.isPending && !decks.isError && rows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No decks yet. Paste a shared deck link or create a deck in SWUBASE.
                </p>
              )}
              <label className="block text-sm" htmlFor="crossfire-deck">
                Or paste a deck link / ID
              </label>
              <Input
                id="crossfire-deck"
                value={field.state.value}
                onChange={e => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="https://swubase.com/decks/…"
                autoComplete="off"
              />
              {field.state.value && !deckId && (
                <p className="text-sm text-destructive">
                  Enter a SWUBASE deck link or a valid deck ID.
                </p>
              )}
            </div>
          )}
        </form.Field>
        {deckId && (
          <div aria-live="polite" className="rounded-lg border p-3 text-sm">
            {readiness.isFetching ? (
              'Checking this deck…'
            ) : readiness.isError ? (
              <>
                <p role="alert">{crossfireError(readiness.error)}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void readiness.refetch()}
                >
                  Check again
                </Button>
              </>
            ) : readiness.data?.ready ? (
              <p>Ready for Crossfire practice.</p>
            ) : (
              <>
                <p className="mb-2 font-medium">
                  This deck needs more card support before it can play.
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {readiness.data?.issues.map((issue, i) => (
                    <li key={i}>
                      {issue.cardId
                        ? `${catalog?.cards[issue.cardId]?.name ?? words(issue.cardId)}: `
                        : ''}
                      {issueLabel(issue)}
                      {issue.zone ? ` (${issue.zone})` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        {policy ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p>
              {bestOf === 3
                ? 'Best of three · first to two wins, with sideboarding'
                : 'Single game'}
            </p>
            <PolicySummary policy={policy} />
            <form.Field name="consent">
              {field => (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={field.state.value}
                    onCheckedChange={v => field.handleChange(v === true)}
                    disabled={pending}
                  />
                  <span>I agree to these visibility settings. Join and start the game.</span>
                </label>
              )}
            </form.Field>
          </div>
        ) : (
          <div className="space-y-3">
            <form.Field name="bestOfThree">
              {field => (
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={field.state.value}
                    onCheckedChange={v => field.handleChange(v === true)}
                  />
                  Best of three with sideboarding
                </label>
              )}
            </form.Field>
            <p className="font-medium">Game visibility</p>
            <form.Field name="allowSpectators">
              {field => (
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={field.state.value}
                    onCheckedChange={v => field.handleChange(v === true)}
                    disabled={pending}
                  />
                  Allow spectators with the invitation link
                </label>
              )}
            </form.Field>
            <form.Field name="handsToPlayers">
              {field => (
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={field.state.value}
                    onCheckedChange={v => field.handleChange(v === true)}
                    disabled={pending}
                  />
                  Reveal both hands to players
                </label>
              )}
            </form.Field>
            <form.Field name="handsToSpectators">
              {field => (
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={values.allowSpectators && field.state.value}
                    onCheckedChange={v => field.handleChange(v === true)}
                    disabled={pending || !values.allowSpectators}
                  />
                  Let spectators reveal both hands
                </label>
              )}
            </form.Field>
            <p className="text-xs text-muted-foreground">
              Your opponent accepts these settings before the game starts. Deck order and face-down
              resources stay private.
            </p>
          </div>
        )}
      </fieldset>
      {!!error && (
        <p role="alert" className="text-sm text-destructive">
          {crossfireError(error)}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={
          pending ||
          !deckId ||
          !readiness.data?.ready ||
          readiness.isFetching ||
          readiness.isError ||
          (!!policy && !values.consent)
        }
      >
        {pending ? 'Preparing game…' : policy ? 'Join game' : 'Create invitation'}
      </Button>
    </form>
  );
}
