import { useContext, useMemo, useState } from 'react';
import { GameCatalog } from './gameCatalog.ts';
import { AbilityChoice } from './AbilityChoice.tsx';
import { AbilityArt } from './AbilityArt.tsx';
import { PlotPlayPrompt } from './PlotPlayPrompt.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import type { CardAction } from './interaction.ts';
import { decisionDescription } from './abilityPresentation.ts';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/components/ui/command.tsx';
import { ChevronsUpDown, Check } from 'lucide-react';
import type { GameView, VisibleDecision } from '../../../../../play/view/types.ts';
import { decisionTitle, optionLabel, words } from './presentation.ts';
import {
  selectionValid,
  sourceOf,
  directTargetOf,
  isBoardTargetChoice,
  inlineTokenChoice,
} from './interaction.ts';
import type { ReactNode } from 'react';

export function GamePrompt({
  view,
  decision,
  seat,
  pending,
  selections,
  renderChoice,
  choose,
  highlight,
  activate,
}: {
  view: GameView;
  decision: VisibleDecision;
  seat?: string;
  pending: boolean;
  selections: string[];
  renderChoice: (id: string) => ReactNode;
  choose: (id: string, selections: string[], namedCardId?: string, chosenNumber?: number) => void;
  highlight: (ids: string[]) => void;
  activate: (action: CardAction) => void;
}) {
  const catalog = useContext(GameCatalog);
  const [name, setName] = useState('');
  const [namesOpen, setNamesOpen] = useState(false);
  const naming = decision.effect === 'name-card';
  const numbering = decision.effect === 'choose-number';
  const [number, setNumber] = useState('');
  const chosenNumber = numbering && number.trim() !== '' ? Number(number) : undefined;
  const validNumber = Number.isSafeInteger(chosenNumber) && chosenNumber! >= 0;
  const names = useMemo(() => {
    const titles = new Map<string, string>();
    if (naming)
      for (const [id, card] of Object.entries(catalog ?? {}))
        if (card && !card.preview && !titles.has(card.title)) titles.set(card.title, id);
    return titles;
  }, [catalog, naming]);
  const namedCardId = naming ? names.get(name) : undefined;
  const selection = decision.selection;
  const triggerChoices = decision.kind === 'trigger' || decision.kind === 'delayed';
  const boardTarget = isBoardTargetChoice(view);
  const tokenChoice = inlineTokenChoice(view);
  const description =
    !triggerChoices && !naming && !numbering && decision.kind !== 'action'
      ? decisionDescription(view, catalog)
      : '';
  // Bring private choices and cards in closed piles into reach. Cards already
  // on the table stay where they are; their click affordance is shared.
  const ids = [
    ...new Set([
      ...(selection?.cards ?? []),
      ...decision.inspectedCards.map(c => c.id),
      ...decision.options.flatMap(o => [...o.cards, ...(sourceOf(o) ? [sourceOf(o)!] : [])]),
    ]),
  ].filter(id => {
    const card = view.cards.find(c => c.id === id);
    return (
      !card ||
      card.zone === 'discard' ||
      card.face?.cardId === 'credit' ||
      (!card.face && decision.inspectedCards.some(c => c.id === id)) ||
      (card.zone === 'captured' && !view.cards.some(c => c.id === card.capturedBy))
    );
  });
  const damageLabel =
    decision.effect === 'allocate-healing'
      ? 'healing'
      : decision.effect === 'allocate-advantage'
        ? 'Advantage tokens'
        : decision.effect === 'allocate-experience'
          ? 'Experience tokens'
          : decision.effect === 'allocate-indirect'
            ? 'indirect damage'
            : 'damage';
  const selectedCost = selections.reduce((sum, id) => sum + (selection?.budget?.costs[id] ?? 0), 0);
  const choosingAspect =
    decision.effect === 'choose-mode' &&
    decision.options.every(o =>
      ['vigilance', 'command', 'aggression', 'cunning', 'heroism', 'villainy'].includes(
        o.mode ?? '',
      ),
    );
  const valid =
    (!naming || !!namedCardId) &&
    (!numbering || validNumber) &&
    selectionValid(decision, tokenChoice?.selections ?? selections);
  const accessible = (id: string) =>
    view.cards.some(c => c.id === id) || decision.inspectedCards.some(c => c.id === id);
  const options = decision.options.filter(o => {
    if (triggerChoices) return true;
    if (tokenChoice?.optionIds.has(o.id)) return o.id === tokenChoice.option.id;
    const source = sourceOf(o),
      target = directTargetOf(o);
    return !(source && accessible(source)) && !(target && accessible(target));
  });
  const tokenChoiceLabel = (() => {
    if (!tokenChoice) return null;
    const title = tokenChoice.host.face!.name.split(',')[0]!.trim();
    const owner = title.endsWith('s') ? `${title}’` : `${title}’s`;
    return `Use ${owner} ${tokenChoice.token.face!.name}`;
  })();
  if (decision.effect === 'plot-play' && decision.source)
    return (
      <PlotPlayPrompt
        decision={decision}
        pending={pending}
        activate={activate}
        skip={id => choose(id, [])}
      />
    );
  return (
    <section
      className={`cf-prompt ${naming || numbering ? 'cf-naming-prompt' : ''} ${selection?.allocation ? 'cf-allocation-prompt' : ''} ${boardTarget ? 'cf-board-target-prompt' : ''} ${!triggerChoices && decision.source ? 'cf-illustrated-prompt' : ''}`}
      aria-label="Game choices"
      aria-busy={pending}
    >
      {!triggerChoices && decision.source && <AbilityArt source={decision.source} />}
      <h2 className="text-sm font-semibold" aria-live="polite">
        {decision.source ? `${decision.source.name} — ` : ''}
        {(decision.effect === 'plot' ? 'Choose Plot cards' : decision.presentation?.title) ??
          (decision.resourcePlan?.confirmed
            ? 'Resources confirmed'
            : choosingAspect
              ? 'Choose an aspect'
              : decision.effect === 'free-play-choice'
                ? 'Choose payment'
                : decision.effect === 'credit-payment'
                  ? 'Pay resource cost'
                  : decision.effect
                    ? words(decision.effect)
                    : decisionTitle[decision.kind])}
      </h2>
      {description && <p className="cf-ability-description">{description}</p>}
      {decision.resourcePlan && (
        <p className="cf-resource-plan" role="status">
          {decision.resourcePlan.confirmed
            ? 'Waiting for the initiative player. Your choice is private until their resourcing resolves.'
            : 'You can confirm now, or wait to see the initiative player’s choice.'}
        </p>
      )}
      {numbering && (
        <Input
          aria-label="Choose a number"
          type="number"
          min={0}
          max={Number.MAX_SAFE_INTEGER}
          step={1}
          inputMode="numeric"
          value={number}
          disabled={pending}
          onChange={event => setNumber(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && valid && !pending) {
              event.preventDefault();
              choose(decision.options[0]!.id, selections, undefined, chosenNumber);
            }
          }}
        />
      )}
      {naming && (
        <Popover open={namesOpen} onOpenChange={setNamesOpen}>
          <PopoverTrigger asChild>
            <Button
              role="combobox"
              aria-label="Name a card"
              aria-expanded={namesOpen}
              disabled={pending || !catalog}
              className="cf-name-select"
              variant="outline"
            >
              <span>{name || 'Choose a card title…'}</span>
              <ChevronsUpDown size={14} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="cf-name-picker w-[min(400px,85vw)] p-0"
            align="start"
            collisionPadding={12}
          >
            <Command>
              <CommandInput placeholder="Search card titles…" aria-label="Search card titles" />
              <CommandList>
                <CommandEmpty>No matching card titles.</CommandEmpty>
                {[...names.keys()].sort().map(title => (
                  <CommandItem
                    key={title}
                    value={title}
                    onSelect={() => {
                      setName(title);
                      setNamesOpen(false);
                    }}
                  >
                    {name === title && <Check size={14} />}
                    {title}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      {(decision.effect === 'order-top-of-deck' || decision.effect === 'order-bottom-of-deck') && (
        <p className="text-sm">Choose the next card in order, topmost first within this group.</p>
      )}
      {decision.effect === 'unit-tax' && (
        <p className="text-sm text-muted-foreground">
          Choose units to pay for. Each chosen unit costs 1 resource; all other units exhaust.
        </p>
      )}
      {decision.effect === 'inspect-resources' && (
        <p className="text-sm text-muted-foreground">
          Choose from the inspected resources to resolve this ability.
        </p>
      )}
      {decision.effect === 'look-discard' && (
        <p className="text-sm">You may discard one of the inspected cards.</p>
      )}
      {decision.effect === 'choose-deck-bottom' && (
        <p className="text-sm">Choose which cards to put on the bottom. The rest stay on top.</p>
      )}
      {decision.effect === 'optional-trigger' && (
        <p className="text-sm">Use this optional ability?</p>
      )}
      {decision.effect === 'ability-payment' && (
        <p className="text-sm">Choose the cards to pay this ability’s cost.</p>
      )}
      {decision.effect === 'exploit-payment' && (
        <p className="text-sm">
          Choose friendly units to defeat with Exploit. Each reduces this card’s cost by 2. If
          payment becomes impossible, the play is cancelled and the board is restored.
        </p>
      )}
      {decision.effect === 'credit-payment' && (
        <p className="text-sm">
          Choose Credit tokens to spend or eligible ready Droid units to exhaust. Each pays for one
          resource; ready resources cover the rest.
        </p>
      )}
      {selection?.disclose && (
        <p className="text-sm">
          Reveal cards with at least these aspect icons: {selection.disclose.required.join(' + ')}.
        </p>
      )}
      {selection && !tokenChoice && (
        <>
          <p className="cf-selection-status text-sm text-muted-foreground">
            {selection.allocation ? 'Allocate ' : 'Select '}
            {selection.min === selection.max
              ? selection.min
              : `${selection.min}–${selection.max}`}{' '}
            {selection.allocation ? damageLabel : selection.max === 1 ? 'card' : 'cards'}.{' '}
            {selections.length} {selection.allocation ? 'assigned' : 'selected'}.
            {(selection.allocation?.quantum ?? 1) > 1 &&
              ` Assign in increments of ${selection.allocation!.quantum}.`}
          </p>
          {selection.budget && (
            <p className="cf-selection-budget text-sm">
              {selection.budget.stat === 'power'
                ? 'Power selected'
                : selection.budget.stat === 'cost' || decision.effect === 'search-deck'
                  ? 'Printed cost selected'
                  : 'Remaining HP selected'}
              : {selectedCost} / {selection.budget.max}
            </p>
          )}
        </>
      )}
      {ids.length > 0 && (
        <div className="cf-choice-cards" aria-label="Cards for this choice">
          {ids.map(renderChoice)}
        </div>
      )}
      <div
        className={`cf-prompt-options ${triggerChoices ? 'cf-trigger-options' : ''} ${choosingAspect ? 'cf-aspect-options' : ''}`}
      >
        {tokenChoice?.skip && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => choose(tokenChoice.skip!.optionId, [])}
          >
            Skip effect
          </Button>
        )}
        {options.map(option =>
          triggerChoices ? (
            <AbilityChoice
              key={option.id}
              option={option}
              view={view}
              pending={pending}
              highlight={highlight}
              index={
                option.ability &&
                options.filter(
                  o =>
                    o.ability?.source.currentCardId === option.ability!.source.currentCardId &&
                    o.ability?.timing === option.ability!.timing &&
                    !/^(ambush|shielded|support|restore|saboteur)/.test(o.ability?.id ?? ''),
                ).length > 1 &&
                !/^(ambush|shielded|support|restore|saboteur)/.test(option.ability.id)
                  ? (option.ability.index ?? 0) + 1
                  : undefined
              }
              choose={() => choose(option.id, selections)}
            />
          ) : (
            <Button
              key={option.id}
              data-option-kind={option.kind}
              data-deployment-available={option.action?.deploymentAvailable}
              data-option-id={option.id}
              data-option-cards={option.cards.join(' ')}
              aria-label={choosingAspect ? words(option.mode!) : undefined}
              title={choosingAspect ? words(option.mode!) : undefined}
              variant={['pass', 'decline-effect'].includes(option.kind) ? 'outline' : 'secondary'}
              className="h-auto min-h-9 whitespace-normal text-left"
              disabled={
                pending ||
                (!valid &&
                  !(
                    ['allocate-damage', 'disclose'].includes(decision.effect ?? '') &&
                    option.kind === 'decline-effect'
                  ))
              }
              onMouseEnter={() =>
                highlight([
                  ...option.cards,
                  ...(option.action?.grantedBy?.currentCardId
                    ? [option.action.grantedBy.currentCardId]
                    : []),
                ])
              }
              onMouseLeave={() => highlight([])}
              onFocus={() =>
                highlight([
                  ...option.cards,
                  ...(option.action?.grantedBy?.currentCardId
                    ? [option.action.grantedBy.currentCardId]
                    : []),
                ])
              }
              onBlur={() => highlight([])}
              onClick={() =>
                choose(
                  option.id,
                  ['allocate-damage', 'disclose'].includes(decision.effect ?? '') &&
                    option.kind === 'decline-effect'
                    ? []
                    : option.id === tokenChoice?.option.id
                      ? tokenChoice.selections
                      : selections,
                  namedCardId,
                  chosenNumber,
                )
              }
            >
              {choosingAspect ? (
                <AspectIcon aspect={option.mode!} size="medium" />
              ) : naming ? (
                'Confirm name'
              ) : numbering ? (
                'Confirm number'
              ) : tokenChoice?.option.id === option.id ? (
                tokenChoiceLabel
              ) : (
                optionLabel(option, view, seat)
              )}
            </Button>
          ),
        )}
      </div>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Waiting for your action to be confirmed…
        </p>
      )}
    </section>
  );
}
