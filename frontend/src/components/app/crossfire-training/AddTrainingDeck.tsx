import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import {
  useAddTrainingDeck,
  useInspectTrainingDeck,
} from '@/api/crossfire-training/useTrainingDashboard.ts';
import { deckIdFromSearch, issueLabel } from '../crossfire/presentation.ts';
import {
  trainingStrategies,
  type TrainingStrategy,
} from '../../../../../shared/types/crossfire-training.ts';
import type { TrainingRuns } from '../../../../../shared/types/crossfire-training-roster.ts';
import type { CrossfireDeckIssue } from '../../../../../shared/types/crossfire.ts';

export default function AddTrainingDeck({
  runs,
  onAdded,
}: {
  runs?: TrainingRuns;
  onAdded: (run: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!runs}>
          <Plus className="mr-2 size-4" />
          Add training deck
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a training deck</DialogTitle>
          <DialogDescription>
            Choose a SWUBASE deck and its archetypes. Its current list will be saved in a new
            prepared run.
          </DialogDescription>
        </DialogHeader>
        {open && runs && (
          <DeckForm
            runs={runs}
            onAdded={run => {
              setOpen(false);
              onAdded(run);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeckForm({ runs, onAdded }: { runs: TrainingRuns; onAdded: (run: string) => void }) {
  const inspect = useInspectTrainingDeck(runs.mutationToken);
  const add = useAddTrainingDeck(runs.mutationToken);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const form = useForm({
    defaultValues: { deck: '', archetypes: [] as TrainingStrategy[] },
    onSubmit: async ({ value }) => {
      const deckId = deckIdFromSearch(value.deck, window.location.origin);
      if (
        !deckId ||
        !inspect.data?.ready ||
        !inspect.data.contentHash ||
        inspect.data.deckId !== deckId ||
        !value.archetypes.length
      )
        return;
      try {
        const result = await add.mutateAsync({
          deckId,
          archetypes: value.archetypes,
          revision: runs.revision,
          contentHash: inspect.data.contentHash,
          requestId,
        });
        onAdded(result.run);
      } catch {
        /* Mutation error is displayed below. */
      }
    },
  });
  const values = useStore(form.store, state => state.values);
  const deckId = deckIdFromSearch(values.deck, window.location.origin);
  const checked = inspect.data?.deckId === deckId ? inspect.data : undefined;
  const pending = inspect.isPending || add.isPending;
  return (
    <form
      className="space-y-5"
      onSubmit={event => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        <form.Field name="deck">
          {field => (
            <div className="space-y-2">
              <label htmlFor="training-deck-link" className="text-sm font-medium">
                Deck link or ID
              </label>
              <div className="flex gap-2">
                <Input
                  id="training-deck-link"
                  autoComplete="off"
                  placeholder="https://swubase.com/decks/…"
                  value={field.state.value}
                  onChange={event => {
                    field.handleChange(event.target.value);
                    inspect.reset();
                    add.reset();
                  }}
                  onBlur={field.handleBlur}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!deckId || pending}
                  onClick={() => {
                    setRequestId(crypto.randomUUID());
                    add.reset();
                    if (deckId) inspect.mutate(deckId);
                  }}
                >
                  {inspect.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Check deck'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use a public/shared deck, or sign in to add your private deck.{' '}
                <a href="/decks" target="_blank" rel="noreferrer" className="underline">
                  Browse decks
                </a>
              </p>
              {values.deck && !deckId && (
                <p className="text-sm text-destructive">
                  Enter a SWUBASE deck link or a valid deck ID.
                </p>
              )}
            </div>
          )}
        </form.Field>
        {checked && (
          <div className="rounded-lg border p-3 text-sm" aria-live="polite">
            <p className="font-medium">{checked.name}</p>
            <p className="text-muted-foreground">
              {checked.leaderName} · {checked.baseName} · {checked.cards} cards
            </p>
            {checked.ready ? (
              <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                Ready to add to training.
              </p>
            ) : (
              <>
                <p className="mt-2 font-medium">This deck needs changes or more engine support.</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {checked.issues.map((issue, i) => (
                    <li key={i}>
                      {issue.cardId ? `${issue.cardId}: ` : ''}
                      {issueLabel(issue as CrossfireDeckIssue)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        <form.Field name="archetypes">
          {field => (
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">
                Archetypes{' '}
                <span className="font-normal text-muted-foreground">· select one or more</span>
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {trainingStrategies.map(strategy => (
                  <label
                    key={strategy.key}
                    className="flex items-center gap-2 rounded-md border p-3 text-sm"
                  >
                    <Checkbox
                      checked={field.state.value.includes(strategy.key)}
                      onCheckedChange={value => {
                        add.reset();
                        setRequestId(crypto.randomUUID());
                        field.handleChange(
                          value === true
                            ? [...field.state.value, strategy.key]
                            : field.state.value.filter(s => s !== strategy.key),
                        );
                      }}
                    />
                    {strategy.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Describe this list, not every deck with its leader. Different lists can share a
                leader and use different archetypes.
              </p>
            </fieldset>
          )}
        </form.Field>
      </fieldset>
      <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
        The existing model and history stay available. Compatible weights are carried forward; a new
        leader gets a new specialist. Training stays stopped.
      </p>
      {(inspect.error || add.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(inspect.error || add.error)?.message}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={pending || !checked?.ready || !values.archetypes.length}
      >
        {add.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {add.isPending ? 'Preparing the new run…' : 'Add deck and prepare run'}
      </Button>
    </form>
  );
}
