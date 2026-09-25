import { BrainCircuit, GitBranch, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import {
  trainingStrategies,
  type TrainingStatus,
} from '../../../../../shared/types/crossfire-training.ts';
import { modelGroups, rosterCards, type ModelCardData } from './lab-data.ts';
import { number } from './format.ts';
import { LabSection, ModelHash, ProgressBar } from './LabPrimitives.tsx';

const strategyNames = Object.fromEntries(trainingStrategies.map(s => [s.key, s.label]));
export function ModelCards({
  cards,
  selectedDeck,
  selectedStrategies = [],
  onDeck,
}: {
  cards: ModelCardData[];
  selectedDeck: string;
  selectedStrategies?: readonly string[];
  onDeck: (key: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(card => {
        const selected =
          card.deck === selectedDeck ||
          (card.eligible && card.strategies?.some(s => selectedStrategies.includes(s)));
        return (
          <article
            key={card.id}
            className={cn(
              'min-w-0 rounded-lg border p-4',
              selected && 'border-primary/60 bg-primary/5',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              {card.deck ? (
                <Button
                  variant="ghost"
                  className="-ml-3 h-auto max-w-full whitespace-normal py-1 text-left font-semibold"
                  aria-pressed={card.deck === selectedDeck}
                  onClick={() => onDeck(card.deck!)}
                >
                  {card.label}
                </Button>
              ) : (
                <h3 className="font-semibold">{card.label}</h3>
              )}
              {card.active && <Badge variant="outline">Current learner</Badge>}
            </div>
            {!!card.strategies?.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {card.strategies.map(s => (
                  <Badge key={s} variant="secondary">
                    {strategyNames[s]}
                  </Badge>
                ))}
              </div>
            )}
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {card.games !== undefined && (
                <div>
                  <dt className="text-muted-foreground">Training games</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{number(card.games)}</dd>
                </div>
              )}
              {card.updates !== undefined && (
                <div>
                  <dt className="text-muted-foreground">
                    {card.eligible ? 'Eligible updates' : 'Updates'}
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{number(card.updates)}</dd>
                </div>
              )}
              {card.decisions !== undefined && (
                <div>
                  <dt className="text-muted-foreground">
                    {card.eligible ? 'Eligible decisions' : 'Decisions'}
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{number(card.decisions)}</dd>
                </div>
              )}
            </dl>
            {card.epochs && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span>Initial practice</span>
                  <span>
                    {number(card.epochs.completed)} / {number(card.epochs.target)} epochs
                  </span>
                </div>
                <ProgressBar label={`${card.label} initial practice`} {...card.epochs} />
                <p className="text-xs text-muted-foreground">
                  {number(card.refreshEpochs)} refresher epochs
                </p>
              </div>
            )}
            {card.note && <p className="mt-2 text-xs text-muted-foreground">{card.note}</p>}
            {(card.parameters !== undefined || card.modelHash !== undefined) && (
              <div className="mt-3 flex flex-wrap justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                {card.parameters !== undefined && <span>{number(card.parameters)} parameters</span>}
                {card.modelHash !== undefined && <ModelHash hash={card.modelHash} />}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
export default function ModelOverview({
  status: s,
  deck,
  onDeck,
}: {
  status: TrainingStatus;
  deck: string;
  onDeck: (key: string) => void;
}) {
  const roster = rosterCards(s),
    groups = modelGroups(s),
    selected = roster.find(d => d.deck === deck);
  const specialized = !!(s.rotation || s.system),
    expanded = s.system?.initialization === 'expanded';
  const description = s.rotation
    ? 'Each deck keeps a separate bundle of leader and strategy specialists, its own action scorer, and optimizer. Select a deck to inspect its practice and matchup results.'
    : s.system
      ? 'Each list keeps its assigned archetypes. Lists with the same leader share a leader specialist within this model.'
      : 'These decks use one shared policy. Deck-specific training counters were not recorded for this run.';
  const steps = specialized
    ? [
        ['Shared encoder', 'Reads your deck, the visible board, and legal choices.'],
        [
          'Leader & strategies',
          `Adds leader knowledge and the selected deck’s strategies${selected?.strategies?.length ? `: ${selected.strategies.map(s => strategyNames[s]).join(', ')}` : ''}.`,
        ],
        ['Matchup adapter', 'Adjusts to public opponent information and current threats.'],
        ['Action scorer', 'Combines learned features to score each legal choice.'],
      ]
    : [
        ['Visible position', 'Reads the acting player’s observations and legal choices.'],
        ['Shared policy', 'Uses the same learned network across every deck in this roster.'],
        ['Action scores', 'Ranks legal choices using the saved model.'],
      ];
  return (
    <section className="space-y-4" aria-label="Model overview">
      <LabSection
        title="Training roster"
        description={description}
        actions={
          <Badge variant="outline">
            {roster.length} decks · {s.rotation ? 'separate bundles' : 'shared model'}
          </Badge>
        }
      >
        <ModelCards cards={roster} selectedDeck={deck} onDeck={onDeck} />
      </LabSection>
      <details className="group rounded-xl border bg-card">
        <summary className="cursor-pointer p-4 text-sm font-semibold sm:px-6">
          <BrainCircuit className="mr-2 inline size-4" />
          Model architecture & specialist details
        </summary>
        <div className="space-y-4 px-3 pb-4 sm:px-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {s.rotation
              ? 'Every deck bundle started fresh. Training switches between bundles while retaining each deck’s progress.'
              : expanded
                ? `Compatible weights were inherited from ${number(s.system?.inheritedGames)} games. New leader modules started fresh.`
                : specialized
                  ? 'Specialists started from fresh weights. The retired league model is retained as a frozen reference opponent.'
                  : 'Archived shared-policy training is preserved for comparison.'}
            {specialized && ' Playing strength remains unqualified for release.'}
          </p>
          <LabSection
            title="How a move is chosen"
            actions={<GitBranch className="size-4 text-muted-foreground" />}
          >
            <ol
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Action scoring pipeline"
            >
              {steps.map(([title, detail], i) => (
                <li key={title} className="rounded-lg border bg-muted/20 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">
                      {i + 1}
                    </span>
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" />
              Opponent hands and deck order remain hidden. Archetype tags describe the selected
              list.
            </p>
          </LabSection>
          {groups.map(group => (
            <LabSection key={group.title} title={group.title} description={group.description}>
              <ModelCards
                cards={group.cards}
                selectedDeck={deck}
                selectedStrategies={selected?.strategies}
                onDeck={onDeck}
              />
            </LabSection>
          ))}
          {s.baseline && (
            <p className="text-xs text-muted-foreground">
              Frozen reference: {number(s.baseline.games)}-game legacy model ·{' '}
              <ModelHash hash={s.baseline.sha256} />
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
