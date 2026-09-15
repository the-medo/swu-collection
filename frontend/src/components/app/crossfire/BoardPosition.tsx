import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LayoutGroup } from 'motion/react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Coins, Flag, Layers, Mountain, Orbit, Swords, X } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.tsx';
import type { GameView, VisibleCard } from '../../../../../play/view/types.ts';
import { GameCard, FaceImage } from './GameCard.tsx';
import { CardBack } from './CardBack.tsx';
import { CrossfireLogo } from './CrossfireLogo.tsx';
import { TokenGroup } from './TokenGroup.tsx';
import { Hand } from './Hand.tsx';
import { CardInspection } from './CardInspection.tsx';
import { useCardInspection } from './useCardInspection.ts';
import { GamePrompt } from './GamePrompt.tsx';
import { GameLog, ConnectedGameLog } from './GameLog.tsx';
import { CrossfireConnection } from './connection.ts';
import { playerName, optionLabel, words, decisionTitle } from './presentation.ts';
import {
  freshInteraction,
  currentInteraction,
  changeSelection,
  activeAction,
  actionableCards,
  cardActions,
  activateCardAction,
  pressCard,
  targetOf,
  type CardPress,
  type BoardOption,
  isBoardTargetChoice,
} from './interaction.ts';

function actionName(option: BoardOption) {
  if (option.kind === 'attack') return 'Attack';
  if (option.kind === 'play' && option.plot)
    return `${option.piloting ? 'Plot as a pilot' : 'Plot'}${option.plot.useOtherResources ? ' · Pay with other resources' : ''}`;
  if (option.kind === 'play')
    return option.smuggle
      ? `Smuggle · ${option.smuggle.cost} resources`
      : option.piloting
        ? 'Play as a pilot'
        : 'Play card';
  if (option.kind === 'use-ability') return words(option.action?.id ?? 'Use ability');
  if (option.kind === 'choose-mode') return words(option.mode ?? 'Choose effect');
  return option.ability?.grantedBy
    ? `Resolve · ${option.ability.grantedBy.name}`
    : 'Resolve ability';
}
export function BoardPosition({
  view,
  seat,
  pending,
  connection,
  logOpen,
  closeLog,
  readOnly = !connection,
  readOnlyLabel = 'Replay',
  bottomSeat,
}: {
  view: GameView;
  seat?: string;
  pending: boolean;
  connection?: CrossfireConnection;
  logOpen: boolean;
  closeLog: () => void;
  readOnly?: boolean;
  readOnlyLabel?: string;
  bottomSeat?: string;
}) {
  const [stored, setInteraction] = useState(() => freshInteraction(view));
  const interaction = currentInteraction(view, stored);
  const action = activeAction(view, interaction);
  const available = pending || readOnly ? [] : actionableCards(view, interaction);
  const [highlighted, highlight] = useState<string[]>([]);
  const [inspected, inspect] = useState<string | null>(null);
  const deckInspection = useCardInspection(view.privateDeckTop?.id ?? null, inspect);
  const [pile, setPile] = useState<{ player: string; zone: 'resources' | 'discard' } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const [hiddenChoice, hideChoice] = useState<string | null>(null);
  const allocating = !readOnly && !!view.decision?.selection?.allocation;
  const boardTarget = !readOnly && isBoardTargetChoice(view);
  const floatingChoice =
    !readOnly && view.decision && view.decision.kind !== 'action' && !allocating && !boardTarget;
  const lower = bottomSeat ?? seat ?? 'p1',
    upper = view.players.find(p => p.id !== lower)!.id;
  const label = (id: string) => (seat && id !== seat ? 'Opponent' : playerName(id, seat));
  function cancel() {
    setInteraction(freshInteraction(view));
  }
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !logOpen && (inspected || pile)) {
        e.preventDefault();
        e.stopPropagation();
        if (inspected) inspect(null);
        else setPile(null);
        return;
      }
      if (
        e.key === 'Escape' &&
        !logOpen &&
        !inspected &&
        !pile &&
        (interaction.source || interaction.selections.length)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setInteraction(freshInteraction(view));
        const source = board.current?.querySelector<HTMLButtonElement>(
          `[data-card-handle="${interaction.source}"]`,
        );
        source?.focus();
      }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [view, interaction.source, interaction.selections.length, inspected, pile, logOpen]);
  function choose(id: string, selections: string[], name?: string, chosenNumber?: number) {
    if (!readOnly && !pending && connection?.choose(id, selections, name, chosenNumber)) {
      cancel();
      highlight([]);
      setPile(null);
    }
  }
  function apply(result: CardPress) {
    if (result.kind === 'interaction') {
      setInteraction(result.interaction);
      if (result.interaction.action) setPile(null);
    }
    if (result.kind === 'submit') choose(result.optionId, result.selections);
  }
  const copy = (card: VisibleCard) =>
    view.cards.filter(c => c.face?.cardId === card.face?.cardId).findIndex(c => c.id === card.id) +
    1;
  function renderCard(
    card: VisibleCard,
    animated = true,
    handFan = false,
    resourceBack = false,
    capturedBack = false,
  ) {
    const menuOpen =
      !readOnly && interaction.source === card.id && (!interaction.action || !!interaction.target);
    const actions = cardActions(view.decision, card.id);
    const options = interaction.target
      ? action?.options.filter(o => targetOf(o) === interaction.target)
      : null;
    const menu = menuOpen ? (
      <>
        <p className="px-2 py-1 text-xs font-semibold text-slate-400">
          {card.face?.name ?? 'Card'}
        </p>
        {options
          ? options.map(option => (
              <Button
                key={option.id}
                variant="ghost"
                className="h-auto min-h-10 w-full justify-start whitespace-normal text-left"
                disabled={pending}
                data-option-kind={option.kind}
                data-option-id={option.id}
                data-option-cards={option.cards.join(' ')}
                onClick={() => choose(option.id, interaction.selections)}
              >
                {optionLabel(option, view, seat)}
              </Button>
            ))
          : actions.map(a => (
              <Button
                key={a.key}
                variant="ghost"
                className="h-auto min-h-10 w-full justify-between whitespace-normal text-left"
                disabled={pending}
                data-option-kind={a.option.kind}
                data-option-id={a.option.id}
                data-option-cards={a.option.cards.join(' ')}
                data-deployment-available={a.option.action?.deploymentAvailable}
                onClick={() => apply(activateCardAction(view, interaction, a))}
              >
                <span>
                  {actionName(a.option)}
                  {a.option.action?.grantedBy && (
                    <small className="block text-slate-400">{a.option.action.grantedBy.name}</small>
                  )}
                </span>
                <ArrowRight size={14} />
              </Button>
            ))}
      </>
    ) : undefined;
    const assignment = allocating && view.decision!.selection!.cards.includes(card.id);
    return (
      <GameCard
        key={card.id}
        card={card}
        copy={Math.max(1, copy(card))}
        highlighted={highlighted.includes(card.id)}
        selected={
          interaction.source === card.id || !!view.decision?.resourcePlan?.cards.includes(card.id)
        }
        available={available.includes(card.id)}
        targeting={!!action || boardTarget}
        amount={interaction.selections.filter(c => c === card.id).length}
        menu={menu}
        closeMenu={cancel}
        animated={animated}
        handFan={handFan}
        resourceBack={resourceBack}
        capturedBack={capturedBack}
        allocation={
          assignment
            ? {
                plusDisabled:
                  pending ||
                  changeSelection(view, interaction, card.id).selections.length ===
                    interaction.selections.length,
                minusDisabled: pending || !interaction.selections.includes(card.id),
                change: remove => {
                  if (!pending) setInteraction(changeSelection(view, interaction, card.id, remove));
                },
              }
            : undefined
        }
        onSelect={id => {
          if (resourceBack && !view.decision?.selection?.cards.includes(id) && !action)
            setPile({ player: card.controller, zone: 'resources' });
          else if (!readOnly) apply(pressCard(view, interaction, id, pending));
        }}
        onInspect={inspect}
      />
    );
  }
  function renderChoice(id: string) {
    const card = view.cards.find(c => c.id === id);
    const inspected = view.decision?.inspectedCards.find(c => c.id === id);
    if (card) {
      if (pile && card.zone === pile.zone && card.controller === pile.player) return null;
      return renderCard({ ...card, face: card.face ?? inspected?.face ?? null }, false);
    }
    if (!inspected) return null;
    // The face and opaque handle come from this viewer's private choice. The
    // display shell supplies no identity or location beyond that projection.
    return renderCard(
      {
        ...inspected,
        owner: seat ?? lower,
        controller: seat ?? lower,
        zone: 'hand',
        exhausted: false,
        damage: 0,
        deployedAs: null,
        capturedBy: null,
        attachedTo: null,
        abilityUses: {},
        limitedActions: [],
      },
      false,
    );
  }
  function capturedCards(guard: VisibleCard) {
    const cards = view.cards.filter(c => c.capturedBy === guard.id);
    return (
      cards.length > 0 && (
        <div className="cf-captured" aria-label="Captured cards">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="cf-captive-slot"
              style={{ '--captive-index': index } as CSSProperties}
            >
              {renderCard(card, false, false, false, true)}
            </div>
          ))}
        </div>
      )
    );
  }
  function arena(player: string, zone: 'space' | 'ground') {
    const cards = view.cards.filter(
      c => c.controller === player && c.zone === zone && !c.attachedTo,
    );
    return (
      <section
        className={`cf-arena cf-${zone} ${player === upper ? 'cf-opponent' : 'cf-own'}`}
        aria-label={`${label(player)} ${zone}`}
      >
        <div className="cf-arena-cards">
          {cards.map(card => (
            <div key={card.id} className="cf-unit-stack">
              <div
                className="cf-attached-stack"
                style={
                  {
                    '--upgrade-count': view.cards.filter(
                      c => c.attachedTo === card.id && !c.face?.token,
                    ).length,
                  } as CSSProperties
                }
              >
                {capturedCards(card)}
                {view.cards
                  .filter(c => c.attachedTo === card.id && !c.face?.token)
                  .map((c, i) => (
                    <div
                      key={c.id}
                      className="cf-upgrade-underlay"
                      style={{ '--upgrade-index': i + 1 } as CSSProperties}
                    >
                      {renderCard(c)}
                    </div>
                  ))}
                <div className="cf-host-card">{renderCard(card)}</div>
                {[
                  ...new Set(
                    view.cards
                      .filter(c => c.attachedTo === card.id && c.face?.token)
                      .map(c => c.face!.cardId),
                  ),
                ].map(type => (
                  <TokenGroup
                    key={type}
                    type={type}
                    cards={view.cards.filter(
                      c => c.attachedTo === card.id && c.face?.cardId === type,
                    )}
                    available={available}
                    highlighted={highlighted}
                    selections={interaction.selections}
                    renderCard={c => renderCard(c, false)}
                    inspect={inspect}
                  />
                ))}
              </div>
            </div>
          ))}
          {!cards.length && (
            <span className="cf-empty-arena">{zone === 'space' ? <Orbit /> : <Mountain />}</span>
          )}
        </div>
      </section>
    );
  }
  function command(player: string) {
    const cards = view.cards.filter(c => c.controller === player && c.zone === 'base');
    const leader = cards.find(c => c.face?.kind === 'leader');
    const base = cards.find(c => c.face?.kind === 'base');
    const deployed = view.cards.find(
      c => c.owner === player && c.face?.printedKind === 'leader' && c.zone !== 'base',
    );
    const leaderSlot = (
      <div className="cf-command-slot">
        {leader ? (
          renderCard(leader)
        ) : (
          <span className="cf-deployed">
            <Swords size={18} />
            Leader deployed{deployed?.face?.name && <small>{deployed.face.name}</small>}
          </span>
        )}
      </div>
    );
    const baseSlot = (
      <div className="cf-command-slot cf-base-slot">
        {base && capturedCards(base)}
        {base && renderCard(base)}
        <div className="cf-force-over-base">
          {view.cards
            .filter(c => c.controller === player && c.face?.cardId === 'the-force')
            .map(c => renderCard(c))}
        </div>
      </div>
    );
    return (
      <section
        className={`cf-command ${player === upper ? 'cf-opponent' : 'cf-own'}`}
        aria-label={`${label(player)} base area`}
      >
        {player === upper ? leaderSlot : baseSlot}
        <span className="cf-player-label">
          {label(player)}
          {view.initiative.holder === player && (
            <span
              className="cf-initiative"
              title={view.initiative.claimed ? 'Initiative claimed' : 'Initiative'}
            >
              <Flag size={12} />
              {view.initiative.claimed ? 'Claimed' : 'Initiative'}
            </span>
          )}
        </span>
        {player === upper ? baseSlot : leaderSlot}
      </section>
    );
  }
  function rail(player: string) {
    const info = view.players.find(p => p.id === player)!;
    const hand = view.cards.filter(c => c.zone === 'hand' && c.controller === player);
    const discard = view.cards.filter(c => c.zone === 'discard' && c.owner === player);
    const resources = view.cards.filter(
      c => c.zone === 'resources' && c.controller === player && c.face?.kind !== 'player-token',
    );
    const credits = view.cards.filter(c => c.controller === player && c.face?.cardId === 'credit');
    const top = discard[discard.length - 1];
    const deckTop = player === seat ? view.privateDeckTop : null;
    return (
      <section
        className={`cf-player-rail ${player === upper ? 'cf-opponent' : 'cf-own'}`}
        aria-label={`${label(player)} player area`}
      >
        <div className="cf-supplies">
          <button
            className="cf-pile"
            onClick={() => setPile({ player, zone: 'discard' })}
            aria-label={`${label(player)} discard · ${discard.length} cards`}
          >
            <span className="cf-pile-art">
              {top?.face ? <FaceImage face={top.face} className="h-full w-full" /> : <Layers />}
            </span>
            <span>
              Discard <b>{discard.length}</b>
            </span>
          </button>
          <button
            className="cf-pile"
            disabled={!deckTop}
            {...(deckTop ? deckInspection : {})}
            aria-label={
              deckTop
                ? `Inspect top of your deck: ${deckTop.face.name}`
                : `${label(player)} deck · ${info.deckCount} cards`
            }
          >
            <span className="cf-pile-art">
              {deckTop ? <FaceImage face={deckTop.face} className="h-full w-full" /> : <CardBack />}
            </span>
            <span>
              Deck <b>{info.deckCount}</b>
            </span>
          </button>
          <button
            className="cf-resources"
            data-available={resources.some(c => available.includes(c.id))}
            aria-haspopup="dialog"
            onClick={() => setPile({ player, zone: 'resources' })}
            aria-label={`${label(player)} resources · ${resources.filter(c => !c.exhausted).length} ready / ${resources.length} · ${credits.length} Credits`}
          >
            <span>
              <Layers />
              <b>
                {resources.filter(c => !c.exhausted).length}
                <small> / {resources.length}</small>
              </b>
              <em>Resources</em>
            </span>
            <span className="cf-credit-count">
              <Coins />
              <b>{credits.length}</b>
              <em>Credits</em>
            </span>
          </button>
        </div>
        <div className="cf-resource-row" aria-label={`${label(player)} resources in play`}>
          {resources.map(c => renderCard(c, true, false, true))}
        </div>
        <Hand
          cards={hand}
          count={info.handCount}
          own={player === seat}
          label={`${label(player)} hand`}
          renderCard={c => renderCard(c, true, true)}
        />
        <span className="cf-rail-label">
          {label(player)}
          <small>{info.handCount} cards in hand</small>
        </span>
      </section>
    );
  }
  const source = view.cards.find(c => c.id === interaction.source);
  const activityRail = (
    <aside className="cf-log-rail" aria-label="Match activity">
      <div className="cf-log-heading">
        <span>
          <span className="cf-status-dot" />
          Match activity
        </span>
      </div>
      <div className="cf-round-marker">
        ROUND {view.round}
        <span>{words(view.phase)} phase</span>
      </div>
      {!readOnly && seat && connection ? (
        <ConnectedGameLog
          connection={connection}
          view={view}
          seat={seat}
          highlight={highlight}
          inspect={inspect}
        />
      ) : (
        <GameLog view={view} seat={seat} highlight={highlight} inspect={inspect} />
      )}
      {view.scheduled.length > 0 && (
        <details className="cf-scheduled">
          <summary>{view.scheduled.length} scheduled abilities</summary>
          {view.scheduled.map(item => (
            <p
              key={item.id}
              onMouseEnter={() =>
                highlight(item.target?.currentCardId ? [item.target.currentCardId] : [])
              }
              onMouseLeave={() => highlight([])}
            >
              {item.source.name} · {words(item.kind)}
              {item.target ? ` · ${item.target.name}` : ''}
              {item.amount ? ` · ${item.amount}` : ''}
            </p>
          ))}
        </details>
      )}
      <div className="cf-log-footer">
        <CrossfireLogo dark />
        CROSSFIRE<span>SWUBASE</span>
      </div>
    </aside>
  );
  return (
    <LayoutGroup id={view.epoch}>
      <div
        className="cf-match"
        ref={board}
        data-decision-id={view.decision?.id ?? ''}
        data-view-revision={view.revision}
      >
        <div className="cf-table">
          {rail(upper)}
          <div className="cf-battlefield">
            {arena(upper, 'space')}
            {command(upper)}
            {arena(upper, 'ground')}
            <div
              className={`cf-action-band ${view.decision ? 'cf-your-choice' : ''}`}
              id="crossfire-choices"
              tabIndex={-1}
            >
              {readOnly ? (
                <p role="status" className="cf-waiting">
                  <span className="cf-status-dot" />
                  {view.result
                    ? `${view.result.winner ? `${label(view.result.winner)} won` : 'Draw'}`
                    : `${readOnlyLabel} · ${words(view.phase)} phase`}
                  <small>
                    {view.decision
                      ? `${view.decision.source?.name ? `${view.decision.source.name} · ` : ''}${view.decision.effect ? words(view.decision.effect) : decisionTitle[view.decision.kind]}`
                      : `Round ${view.round}`}
                  </small>
                </p>
              ) : view.result ? (
                <div role="status" className="cf-result">
                  <Swords />
                  <strong>
                    {view.result.winner
                      ? `${label(view.result.winner)} ${view.result.winner === seat ? 'win' : 'wins'}!`
                      : 'Draw'}
                  </strong>
                  <span>{words(view.result.reason)}</span>
                  <Link to="/crossfire">Play another game</Link>
                </div>
              ) : action ? (
                <div className="cf-target-instruction" role="status">
                  <Swords />
                  <div>
                    <strong>
                      {actionName(action.option)}
                      <span> · {source?.face?.name}</span>
                    </strong>
                    <p>
                      Click a highlighted{' '}
                      {action.option.kind === 'attack'
                        ? 'unit or base to attack'
                        : 'card to choose your target'}
                      .
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={cancel}>
                    Cancel <kbd>Esc</kbd>
                  </Button>
                </div>
              ) : view.decision ? (
                <>
                  <p className="cf-action-hint" hidden={allocating || boardTarget}>
                    <span className="cf-status-dot" />
                    {floatingChoice || allocating
                      ? view.decision.effect
                        ? words(view.decision.effect)
                        : decisionTitle[view.decision.kind]
                      : 'Your action'}
                    {!floatingChoice && !allocating && (
                      <small>Click a card to play, attack or use an ability</small>
                    )}
                  </p>
                  {floatingChoice ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        hideChoice(hiddenChoice === view.decision!.id ? null : view.decision!.id)
                      }
                    >
                      {hiddenChoice === view.decision.id ? 'Show choice' : 'Hide choice'}
                    </Button>
                  ) : (
                    <GamePrompt
                      key={view.decision.id}
                      view={view}
                      decision={view.decision}
                      seat={seat}
                      pending={pending}
                      selections={interaction.selections}
                      renderChoice={renderChoice}
                      choose={choose}
                      activate={a => apply(activateCardAction(view, interaction, a))}
                      highlight={highlight}
                    />
                  )}
                </>
              ) : (
                <p role="status" className="cf-waiting">
                  <span className="cf-status-dot" />
                  {seat ? 'Waiting for your opponent' : 'Spectating'}
                  <small>
                    {words(view.phase)} phase · Round {view.round}
                  </small>
                </p>
              )}
            </div>
            {arena(lower, 'space')}
            {command(lower)}
            {arena(lower, 'ground')}
          </div>
          {floatingChoice && view.decision && !action && (
            <div
              className="cf-choice-dialog"
              hidden={hiddenChoice === view.decision.id}
              role="dialog"
              aria-modal="false"
              aria-label={
                view.decision.source
                  ? `${view.decision.source.name} — ${words(view.decision.effect ?? 'Choose')}`
                  : decisionTitle[view.decision.kind]
              }
            >
              <button
                className="cf-choice-minimize"
                aria-label="Hide choice to see the board"
                onClick={() => hideChoice(view.decision!.id)}
              >
                <X size={14} />
              </button>
              <GamePrompt
                key={view.decision.id}
                view={view}
                decision={view.decision}
                seat={seat}
                pending={pending}
                selections={interaction.selections}
                renderChoice={renderChoice}
                choose={choose}
                activate={a => apply(activateCardAction(view, interaction, a))}
                highlight={highlight}
              />
            </div>
          )}
          {rail(lower)}
          <p className="cf-table-help">
            {!readOnly && (
              <>
                Click a card to act <span>·</span>{' '}
              </>
            )}
            Hover to preview <span>·</span>
            Right-click, hold for 1 second, or press I to inspect <span>·</span> Esc to cancel
          </p>
        </div>
        {activityRail}
        <Sheet
          open={logOpen}
          onOpenChange={open => {
            if (!open) closeLog();
          }}
        >
          <SheetContent
            className="cf-mobile-log p-0"
            onCloseAutoFocus={e => {
              e.preventDefault();
              document.querySelector<HTMLButtonElement>('[aria-label="Toggle game log"]')?.focus();
            }}
          >
            <SheetTitle className="sr-only">Game log</SheetTitle>
            <SheetDescription className="sr-only">
              Match activity and scheduled abilities.
            </SheetDescription>
            {activityRail}
          </SheetContent>
        </Sheet>
        <CardInspection view={view} selected={inspected} inspect={inspect} />
        <Dialog
          open={!!pile}
          onOpenChange={open => {
            if (!open) setPile(null);
          }}
        >
          <DialogContent className="max-w-3xl cf-pile-dialog">
            <DialogHeader>
              <DialogTitle>
                {pile ? `${label(pile.player)} · ${words(pile.zone)}` : 'Cards'}
              </DialogTitle>
              <DialogDescription>
                Click an available card to use it. Right-click, hold for 1 second, or press I to
                inspect.
              </DialogDescription>
            </DialogHeader>
            <div className="cf-pile-cards">
              {pile &&
                view.cards
                  .filter(
                    c =>
                      c.zone === pile.zone &&
                      c.face?.kind !== 'player-token' &&
                      (pile.zone === 'discard' ? c.owner : c.controller) === pile.player,
                  )
                  .map(c => renderCard(c, false))}
            </div>
            <Button variant="outline" onClick={() => setPile(null)}>
              Back to board
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutGroup>
  );
}
