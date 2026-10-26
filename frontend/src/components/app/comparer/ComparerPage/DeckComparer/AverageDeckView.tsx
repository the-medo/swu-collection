import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useForm } from '@tanstack/react-form';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import ViewRowCard, { type ViewRowCardProps } from './ViewRowCard.tsx';
import {
  averageDeckPayload,
  defaultAverageDeckEntries,
  type AverageDeckDraft,
} from './averageDeckDraft.ts';
import {
  MAX_DECKLIST_CARDS,
  zDeckFromListRequest,
} from '../../../../../../../types/DeckFromList.ts';
import { cardFilterByFormatId, formatDataById } from '../../../../../../../types/Format.ts';
import { useCreateDeckFromList } from '@/api/decks/useCreateDeckFromList.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';
import type { DeckData } from '../../../../../../../types/Deck.ts';
import { comparerTableStyles } from './comparerTableStyles.ts';

type AverageDeckViewProps = ViewRowCardProps & {
  mainDeckData: DeckData;
  draftState: AverageDeckDraft;
  setDraftState: Dispatch<SetStateAction<AverageDeckDraft>>;
  onClose: () => void;
};

const AverageDeckView = (props: AverageDeckViewProps) => {
  const {
    mainDeckData,
    cardComparisons,
    otherDeckEntries,
    cardListData,
    draftState,
    setDraftState,
    onClose,
  } = props;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const source = mainDeckData.deck;
  const format = source.format;
  const twoLeaders = formatDataById[format]?.leaderCount === 2;
  const defaults = defaultAverageDeckEntries(
    cardComparisons,
    otherDeckEntries.map(entry => entry.id),
  );
  const entries = { ...defaults, ...draftState.entries };
  const draft = averageDeckPayload(cardComparisons, entries);
  const distinctCards = Object.keys(draft.cards).length;
  const totals = { 1: 0, 2: 0, 3: 0 };
  for (const boards of Object.values(draft.cards)) {
    for (const board of [1, 2, 3] as const) totals[board] += boards[board] ?? 0;
  }
  const leader = draftState.leader ?? source.leaderCardId1 ?? '';
  const secondLeader = draftState.secondLeader ?? source.leaderCardId2 ?? '';
  const base = draftState.base ?? source.baseCardId ?? '';
  const defaultName = (leaderId = leader, baseId = base) =>
    `Comparer combined deck - ${cardListData?.cards[leaderId]?.name ?? 'Leader'} - ${cardListData?.cards[baseId]?.name ?? 'Base'}`.slice(
      0,
      255,
    );
  const mutation = useCreateDeckFromList();
  const [validationError, setValidationError] = useState<string>();
  const blocked =
    !draft.valid ||
    distinctCards > MAX_DECKLIST_CARDS ||
    !leader ||
    !base ||
    (twoLeaders && (!secondLeader || secondLeader === leader));

  const form = useForm({
    defaultValues: { name: draftState.name ?? defaultName() },
    onSubmit: ({ value }) => {
      if (blocked || mutation.isPending) return;
      const parsed = zDeckFromListRequest.safeParse({
        name: value.name,
        format,
        leaderCardId: leader,
        leaderCardId2: twoLeaders ? secondLeader : undefined,
        baseCardId: base,
        cards: draft.cards,
      });
      if (!parsed.success) {
        setValidationError(parsed.error.issues[0]?.message);
        return;
      }
      setValidationError(undefined);
      mutation.mutate(parsed.data);
    },
  });

  const updateChoice = (field: 'leader' | 'secondLeader' | 'base', value: string | undefined) => {
    setDraftState(previous => ({ ...previous, [field]: value ?? '' }));
    // Follow the selected cards until the user gives the deck their own name.
    if (draftState.name === undefined) {
      form.setFieldValue(
        'name',
        defaultName(
          field === 'leader' ? (value ?? '') : leader,
          field === 'base' ? (value ?? '') : base,
        ),
      );
    }
  };

  const choice = (label: string, cardId: string) => {
    const card = cardListData?.cards[cardId];
    return (
      <button
        type="button"
        disabled={mutation.isPending}
        aria-label={`Choose ${label.toLowerCase()}`}
        className="flex flex-col items-center gap-1 rounded-md p-0.5 hover:bg-[var(--workspace-soft)] focus-visible:outline-2 focus-visible:outline-ring"
      >
        <CardImage
          card={card}
          cardVariantId={card ? selectDefaultVariant(card) : undefined}
          size="w100"
          forceHorizontal
          backSideButton={false}
        />
        <span className="text-[11px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className={comparerTableStyles.withSidebar}>
      <ViewRowCard
        {...props}
        averageDeck={{
          entries,
          disabled: mutation.isPending,
          update: (key, entry) =>
            setDraftState(previous => ({
              ...previous,
              entries: { ...previous.entries, [key]: entry },
            })),
        }}
      />
      <aside
        aria-label="Create combined deck"
        className={cn(workspaceStyles.panel, 'rounded-lg p-3')}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-2 h-7 gap-1.5 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={onClose}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to comparison
        </Button>
        <h2 ref={heading} tabIndex={-1} className={cn(workspaceStyles.heading, 'outline-none')}>
          Combined deck
        </h2>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          {formatDataById[format]?.name} · Created as unlisted
        </p>
        <form
          className="space-y-3"
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
                value.trim().length < 3 ? 'Enter at least 3 characters.' : undefined,
            }}
          >
            {field => (
              <div className="space-y-1">
                <label htmlFor="average-deck-name" className="text-xs font-medium">
                  Deck name
                </label>
                <Input
                  id="average-deck-name"
                  value={field.state.value}
                  title={field.state.value}
                  maxLength={255}
                  disabled={mutation.isPending}
                  onBlur={field.handleBlur}
                  onChange={event => {
                    const name = event.target.value;
                    field.handleChange(name);
                    setDraftState(previous => ({ ...previous, name }));
                  }}
                  className="h-8 text-xs md:text-xs"
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
          <div className="flex flex-wrap justify-center gap-1">
            <LeaderSelector
              trigger={choice('Leader', leader)}
              leaderCardId={leader || undefined}
              onLeaderSelected={id => updateChoice('leader', id)}
              filterByFormat={cardFilterByFormatId[format]}
            />
            {twoLeaders && (
              <LeaderSelector
                trigger={choice('Second leader', secondLeader)}
                leaderCardId={secondLeader || undefined}
                onLeaderSelected={id => updateChoice('secondLeader', id)}
                filterByFormat={cardFilterByFormatId[format]}
              />
            )}
            <BaseSelector
              trigger={choice('Base', base)}
              baseCardId={base || undefined}
              onBaseSelected={id => updateChoice('base', id)}
              filterByFormat={cardFilterByFormatId[format]}
            />
          </div>
          <div className="space-y-1 rounded-md bg-[var(--workspace-soft)] p-2 text-xs tabular-nums">
            <div className="flex justify-between font-medium">
              <span>Different cards</span>
              <span className={cn(distinctCards > MAX_DECKLIST_CARDS && 'text-destructive')}>
                {distinctCards} / {MAX_DECKLIST_CARDS}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{totals[1]} MD</span>
              <span>{totals[2]} SB</span>
              <span>{totals[3]} MB</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Averages below 0.5 become 1 copy in MB (maybeboard). Set a count to 0 to leave that card
            out.
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Changing the compared decks resets this draft.
          </p>
          {!draft.valid && (
            <p role="alert" className="text-xs text-destructive">
              Counts must be nonnegative whole numbers.
            </p>
          )}
          {distinctCards > MAX_DECKLIST_CARDS && (
            <p role="alert" className="text-xs text-destructive">
              Reduce the list to {MAX_DECKLIST_CARDS} different cards before creating the deck.
            </p>
          )}
          {(validationError || mutation.error) && (
            <p role="alert" className="text-xs text-destructive">
              {mutation.error?.message ?? validationError}
            </p>
          )}
          <SignInWrapper text="Sign in to create deck">
            <form.Subscribe selector={state => state.canSubmit}>
              {canSubmit => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit || blocked || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {mutation.isPending ? 'Creating…' : 'Create deck'}
                </Button>
              )}
            </form.Subscribe>
          </SignInWrapper>
        </form>
      </aside>
    </div>
  );
};

export default AverageDeckView;
