import { unitDefeatChoice } from '../engine/unit-defeat.ts';
import { cardMarkers } from './card-markers.ts';
import { effectPresentation } from './effect-presentation.ts';
import { exploitForIntent } from '../engine/exploit.ts';
import { PROTOCOL_VERSION } from '../view/types.ts';
import { smuggleOptions } from '../engine/smuggle.ts';
import { paymentAmount } from '../engine/credits.ts';
import { cardName } from '../engine/identity.ts';
import { abilityPaymentSelection } from '../engine/ability-payment.ts';
import { boundReference, boundUnit } from '../engine/bindings.ts';
import { cardTraits, unitIsLeader } from '../engine/attributes.ts';
import {
  potentialAbilitySources,
  abilityIdentity,
  abilityOrigins,
  effectiveAbilities,
} from '../engine/effective-abilities.ts';
import { createHmac, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { damagePreventionChoice } from '../engine/damage.ts';
import { isToken, isUpgrade, upgradeProfile } from '../engine/roles.ts';
import { isUnit, unitStats, unitKeywords } from '../engine/attachments.ts';
import { decisionForPlayer, resourcePlan } from '../engine/resource-plans.ts';
import { triggerDefinitions } from '../engine/triggers.ts';
import { deployCondition, hitPoints, unitProfile } from '../engine/abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { ActionDefinition } from '../cards/definition.ts';
import { IllegalInput } from '../engine/model.ts';
import type { CardInstance, CardReference, EngineInput, GameState } from '../engine/model.ts';
import { instance } from '../engine/state.ts';
import type { GameView, ViewCommand, VisibleCard } from '../view/types.ts';

export type Viewer =
  | { role: 'player'; playerId: string; showRevealedHands?: boolean }
  | { role: 'spectator'; showRevealedHands?: boolean };
const commandSchema = z.strictObject({
  gameId: z.string(),
  epoch: z.string(),
  expectedRevision: z.number().int().nonnegative(),
  decisionId: z.string(),
  optionId: z.string(),
  selections: z.array(z.string()).max(512).default([]),
  namedCardId: z.string().min(1).max(120).optional(),
  chosenNumber: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
});

// One projector per authorized viewer/connection. The host assigns the viewer;
// clients cannot select their own identity or enable disclosure permissions.
export class Projector {
  readonly #viewer: Viewer;
  readonly #gameId: string;
  readonly #key: string;
  readonly #epoch: string;
  #revision = 0;
  #lastContent = '';
  #earlyResource?: {
    engineRevision: number;
    viewRevision: number;
    decision: NonNullable<GameView['decision']>;
    frame: string;
  };

  constructor(gameId: string, viewer: Viewer, secret = randomBytes(32).toString('hex')) {
    if (secret.length < 32) throw new Error('Projector secret must contain at least 32 characters');
    this.#gameId = gameId;
    this.#viewer = { ...viewer };
    this.#key = secret;
    this.#epoch = this.token('epoch');
  }
  private token(...parts: (string | number)[]): string {
    return createHmac('sha256', this.#key)
      .update(JSON.stringify([this.#gameId, this.#viewer, ...parts]))
      .digest('hex')
      .slice(0, 32);
  }
  private handle(card: CardReference | CardInstance): string {
    return this.token('card', card.instanceId, card.incarnation, card.visibility);
  }
  private handVisible(state: GameState, owner: string): boolean {
    if (this.#viewer.role === 'player' && this.#viewer.playerId === owner) return true;
    return (
      this.#viewer.showRevealedHands !== false &&
      (this.#viewer.role === 'player'
        ? state.disclosure.handsToPlayers
        : state.disclosure.handsToSpectators)
    );
  }
  private face(state: GameState, card: CardInstance): NonNullable<VisibleCard['face']> {
    const definition = cardDefinition(state, card.cardId);
    return {
      cardId: card.cardId,
      ...cardMarkers(state, card),
      name: cardName(state, card),
      side: card.leaderSide === 'back' || card.deployedAs !== null ? 'back' : 'front',
      kind: isUpgrade(state, card) ? 'upgrade' : isUnit(state, card) ? 'unit' : definition.kind,
      traits: [...cardTraits(state, card)],
      leaderUnit: isUnit(state, card) && unitIsLeader(state, card),
      ...(isUnit(state, card) ? { sentinel: unitKeywords(state, card).includes('Sentinel') } : {}),
      printedKind: definition.kind,
      hp:
        definition.kind === 'event' ||
        definition.kind === 'player-token' ||
        (definition.kind === 'leader' && !definition.faces.unit)
          ? null
          : isUpgrade(state, card)
            ? upgradeProfile(definition)!.modifiers.hp
            : isUnit(state, card)
              ? unitStats(state, card).hp
              : hitPoints(definition),
      power:
        definition.kind === 'base' ||
        (definition.kind === 'leader' && !definition.faces.unit) ||
        definition.kind === 'event' ||
        definition.kind === 'player-token'
          ? null
          : isUpgrade(state, card)
            ? upgradeProfile(definition)!.modifiers.power
            : definition.kind === 'upgrade'
              ? definition.modifiers.power
              : isUnit(state, card)
                ? unitStats(state, card).power
                : unitProfile(definition).power,
      token: isToken(definition),
    };
  }
  private cardView(state: GameState, card: CardInstance): VisibleCard | null {
    if (
      card.zone === 'set-aside' ||
      card.zone === 'deck' ||
      (card.zone === 'hand' && !this.handVisible(state, card.owner))
    )
      return null;
    const known =
      card.zone !== 'resources' ||
      cardDefinition(state, card.cardId).kind === 'player-token' ||
      (this.#viewer.role === 'player' && this.#viewer.playerId === card.controller);
    const definition = cardDefinition(state, card.cardId);
    // Printed limits are public for leaders/bases. Include every printed face
    // so a deployed or returned leader retains its deployment-use marker.
    // Unlimited and once-per-round actions must never be labelled Epic/spent.
    const actions: readonly ActionDefinition[] = !known
      ? []
      : definition.kind === 'leader'
        ? Object.values(definition.faces).flatMap(face => face.actions ?? [])
        : definition.kind === 'base'
          ? (definition.actions ?? [])
          : [];
    const limited = new Map<string, VisibleCard['limitedActions'][number]>();
    for (const action of actions) {
      const max =
        action.limit === 'once-per-game'
          ? 1
          : typeof action.limit === 'object' && action.limit
            ? action.limit.max
            : null;
      if (max !== null)
        limited.set(action.id, {
          id: action.id,
          max,
          used: card.abilityUses[action.id] ?? 0,
          deployment: action.effects.some(effect => effect.kind === 'deploy'),
        });
    }
    return {
      id: this.handle(card),
      face: known ? this.face(state, card) : null,
      owner: card.owner,
      controller: card.controller,
      zone: card.zone,
      exhausted: card.exhausted,
      damage: card.damage,
      deployedAs: card.deployedAs,
      capturedBy: card.capturedBy ? this.handle(instance(state, card.capturedBy.instanceId)) : null,
      attachedTo: card.attachedTo ? this.handle(instance(state, card.attachedTo.instanceId)) : null,
      abilityUses: known ? { ...card.abilityUses } : {},
      limitedActions: [...limited.values()],
    };
  }

  project(state: GameState): GameView {
    if (
      state.gameId !== this.#gameId ||
      (this.#viewer.role === 'player' && !state.seats.includes(this.#viewer.playerId))
    )
      throw new IllegalInput();
    // Enumerate visible zone order, not the private instance-allocation order.
    const cards = state.seats
      .flatMap(id => {
        const player = state.players[id]!;
        return [
          player.base,
          ...(instance(state, player.leader).deployedAs ? [] : [player.leader]),
          ...player.tokens,
          ...player.hand,
          ...player.resources,
          ...player.discard,
        ];
      })
      .concat(state.ground, state.space, state.captured)
      .flatMap(id => {
        const view = this.cardView(state, instance(state, id));
        return view ? [view] : [];
      });
    const visibleIds = new Set(cards.filter(card => card.face !== null).map(card => card.id));
    const visibleReference = (ref: CardReference) => ({
      cardId: ref.cardId,
      name: cardName(state, ref),
      ...('deployedAs' in ref
        ? {
            side:
              ref.deployedAs || ('leaderSide' in ref && ref.leaderSide === 'back')
                ? ('back' as const)
                : ('front' as const),
          }
        : {}),
      currentCardId: visibleIds.has(this.handle(ref)) ? this.handle(ref) : null,
    });
    let publicOrder = 0;
    const orders = new Map(
      state.facts.map(f => [f.seq, f.audience === 'public' ? ++publicOrder : publicOrder]),
    );
    const events = state.facts
      .filter(
        event =>
          event.audience === 'public' ||
          (this.#viewer.role === 'player' && event.audience.includes(this.#viewer.playerId)),
      )
      .map(event => ({
        id: this.token('event', event.seq),
        order: orders.get(event.seq)!,
        type: event.type,
        actor: event.actor,
        amount: event.amount,
        ...(event.mode ? { mode: event.mode } : {}),
        ...(event.namedCard ? { namedCard: event.namedCard } : {}),
        cards: event.cards.map(visibleReference),
      }));
    const decision =
      this.#viewer.role === 'player' ? decisionForPlayer(state, this.#viewer.playerId) : null;
    const plan = this.#viewer.role === 'player' ? resourcePlan(state, this.#viewer.playerId) : null;
    const frame = state.execution.frames[0];
    const damageChoice = frame?.kind === 'damage' ? damagePreventionChoice(state, frame) : null;
    const damageSource = damageChoice
      ? damageChoice.options.length > 0 &&
        damageChoice.options.every(
          option =>
            option.source.instanceId === damageChoice.options[0]!.source.instanceId &&
            option.source.incarnation === damageChoice.options[0]!.source.incarnation,
        )
        ? damageChoice.options[0]!.source
        : damageChoice.target
      : null;
    const ownDecision =
      decision && this.#viewer.role === 'player' && decision.playerId === this.#viewer.playerId;
    const content = {
      protocolVersion: PROTOCOL_VERSION,
      gameId: state.gameId,
      epoch: this.#epoch,
      phase: state.phase,
      round: state.round,
      activePlayer: state.activePlayer,
      initiative: { ...state.initiative },
      result: state.result ? { ...state.result } : null,
      players: state.seats.map(id => ({
        id,
        deckCount: state.players[id]!.deck.length,
        handCount: state.players[id]!.hand.length,
      })),
      cards,
      privateDeckTop:
        this.#viewer.role === 'player'
          ? (() => {
              const playerId = this.#viewer.playerId;
              const top = state.players[playerId]!.deck[0];
              if (
                !top ||
                !potentialAbilitySources(state, 'lookAtDeckTop').some(
                  source =>
                    source.controller === playerId &&
                    effectiveAbilities(state, source).lookAtDeckTop,
                )
              )
                return null;
              const card = instance(state, top);
              return { id: this.handle(card), face: this.face(state, card) };
            })()
          : null,
      scheduled: [
        ...state.delayedEffects,
        ...state.execution.frames.flatMap(frame =>
          frame.kind === 'delayed-batch' ? frame.effects : [],
        ),
      ].map(effect => ({
        id: this.token('delayed', effect.id),
        kind:
          effect.kind === 'regroup-operation'
            ? effect.operation === 'bottom'
              ? ('bottom-at-regroup' as const)
              : ('defeat-at-regroup' as const)
            : effect.kind,
        round: effect.dueRound,
        ...(effect.kind === 'victory-at-regroup' ? { arena: effect.arena } : {}),
        ...('amount' in effect ? { amount: effect.amount } : {}),
        source: visibleReference(effect.source),
        target: effect.target ? visibleReference(effect.target) : null,
      })),
      events,
      decision: ownDecision
        ? {
            id: this.token('decision', decision.id),
            kind: decision.kind,
            presentation:
              damageChoice && frame?.kind === 'damage'
                ? {
                    title: 'Prevent damage',
                    text: `${cardName(state, damageChoice.target)} would take ${damageChoice.assignment.amount} damage. ${damageChoice.mandatory ? 'Choose a replacement effect.' : 'Use a replacement effect, or skip it.'}`,
                  }
                : effectPresentation(frame),
            resourcePlan: plan
              ? {
                  confirmed: !!plan.queuedResources,
                  cards: (plan.queuedResources ?? []).map(c =>
                    this.handle(instance(state, c.instanceId)),
                  ),
                }
              : null,
            inspectedCards:
              frame?.kind === 'ability-payment'
                ? abilityPaymentSelection(state, frame).cards.map(id => ({
                    id: this.handle(instance(state, id)),
                    face: this.face(state, instance(state, id)),
                  }))
                : frame?.kind === 'arrange-deck' ||
                    frame?.kind === 'search' ||
                    frame?.kind === 'zone-inspection' ||
                    frame?.kind === 'zone-search'
                  ? frame.cards.map(ref => ({
                      id: this.handle(ref),
                      face: this.face(state, instance(state, ref.instanceId)),
                    }))
                  : frame?.kind === 'effect' &&
                      frame.effect.kind === 'play-card' &&
                      (frame.effect.from === 'deck' ||
                        (frame.effect.from === 'resources' && frame.effect.takeControl))
                    ? (frame.effect.group
                        ? (frame.groups?.[frame.effect.group] ?? [])
                        : frame.effect.target && boundReference(frame, frame.effect.target, state)
                          ? [boundReference(frame, frame.effect.target, state)!]
                          : []
                      ).map(ref => ({
                        id: this.handle(ref),
                        face: this.face(state, instance(state, ref.instanceId)),
                      }))
                    : [],
            source:
              (frame?.kind === 'exploit-payment' || frame?.kind === 'free-play-choice') &&
              state.playPayment
                ? visibleReference(state.playPayment.source)
                : frame?.kind === 'optional-trigger'
                  ? visibleReference(frame.trigger.source)
                  : frame?.kind === 'unit-defeat'
                    ? visibleReference(unitDefeatChoice(state, frame)!)
                    : frame?.kind === 'upgrade-defeat'
                      ? visibleReference(frame.card)
                      : frame?.kind === 'capture-pairs' ||
                          frame?.kind === 'attack-series' ||
                          frame?.kind === 'create-tokens' ||
                          frame?.kind === 'ability-payment' ||
                          frame?.kind === 'unit-tax' ||
                          frame?.kind === 'combat-order' ||
                          frame?.kind === 'arrange-deck' ||
                          frame?.kind === 'effect' ||
                          frame?.kind === 'search' ||
                          frame?.kind === 'zone-inspection' ||
                          frame?.kind === 'zone-search' ||
                          frame?.kind === 'disclose' ||
                          frame?.kind === 'plot-reveal' ||
                          frame?.kind === 'allocate-benefit' ||
                          frame?.kind === 'allocate-damage' ||
                          frame?.kind === 'allocate-indirect'
                        ? visibleReference(frame.source)
                        : frame?.kind === 'damage'
                          ? visibleReference(
                              damageSource ??
                                frame.assignments.find(a => a.excessRoute)!.excessRoute!.source,
                            )
                          : null,
            effect:
              frame?.kind === 'capture-pairs'
                ? frame.chosenGuard
                  ? 'choose-prisoner'
                  : 'choose-capturing-unit'
                : frame?.kind === 'attack-series'
                  ? 'choose-next-attacker'
                  : frame?.kind === 'free-play-choice'
                    ? 'free-play-choice'
                    : frame?.kind === 'exploit-payment'
                      ? 'exploit-payment'
                      : frame?.kind === 'unit-defeat'
                        ? 'attach-self'
                        : frame?.kind === 'upgrade-defeat'
                          ? 'replace-upgrade-defeat'
                          : frame?.kind === 'create-tokens'
                            ? 'double-token-creation'
                            : frame?.kind === 'combat-order'
                              ? 'combat-order'
                              : frame?.kind === 'optional-trigger'
                                ? 'optional-trigger'
                                : frame?.kind === 'ability-payment'
                                  ? 'ability-payment'
                                  : frame?.kind === 'zone-inspection' &&
                                      frame.effect.zone === 'resources'
                                    ? 'inspect-resources'
                                    : frame?.kind === 'unit-tax'
                                      ? 'unit-tax'
                                      : frame?.kind === 'arrange-deck'
                                        ? (
                                            {
                                              'choose-discard': 'look-discard',
                                              'choose-bottom': 'choose-deck-bottom',
                                              'order-top': 'order-top-of-deck',
                                              'order-bottom': 'order-bottom-of-deck',
                                            } as const
                                          )[frame.stage]
                                        : frame?.kind === 'effect' ||
                                            frame?.kind === 'search' ||
                                            frame?.kind === 'zone-inspection' ||
                                            frame?.kind === 'zone-search'
                                          ? frame.effect.kind
                                          : frame?.kind === 'allocate-benefit'
                                            ? (
                                                {
                                                  heal: 'allocate-healing',
                                                  advantage: 'allocate-advantage',
                                                  experience: 'allocate-experience',
                                                  weakness: 'allocate-weakness',
                                                  damage: 'allocate-damage',
                                                } as const
                                              )[frame.effect.benefit]
                                            : frame?.kind === 'credit-payment'
                                              ? 'credit-payment'
                                              : frame?.kind === 'disclose'
                                                ? 'disclose'
                                                : frame?.kind === 'plot-reveal'
                                                  ? 'plot'
                                                  : frame?.kind === 'damage'
                                                    ? damagePreventionChoice(state, frame)
                                                      ? 'prevent-damage'
                                                      : 'redirect-excess-damage'
                                                    : frame?.kind === 'allocate-damage'
                                                      ? 'allocate-damage'
                                                      : frame?.kind === 'allocate-indirect'
                                                        ? 'allocate-indirect'
                                                        : null,
            options: decision.options.map(option => {
              const intent = option.intent;
              const refs =
                'card' in intent
                  ? [
                      intent.card,
                      ...(intent.kind === 'play' && intent.target ? [intent.target] : []),
                      ...(intent.kind === 'use-ability' && intent.costTarget
                        ? [intent.costTarget]
                        : []),
                    ]
                  : intent.kind === 'attack'
                    ? [intent.attacker, intent.defender]
                    : [];
              if (
                intent.kind === 'choose-mode' &&
                frame?.kind === 'effect' &&
                frame.effect.kind === 'choose-mode' &&
                frame.effect.chooserOf
              ) {
                const subject = boundUnit(state, frame, frame.effect.chooserOf);
                if (subject && visibleIds.has(this.handle(subject))) refs.push(subject.instanceId);
              }
              const trigger =
                frame?.kind === 'optional-trigger'
                  ? frame.trigger
                  : intent.kind === 'trigger' && frame?.kind === 'trigger-batch'
                    ? frame.triggers.find(trigger => trigger.id === intent.triggerId)
                    : null;
              const delayed =
                intent.kind === 'delayed' && frame?.kind === 'delayed-batch'
                  ? frame.effects.find(effect => effect.id === intent.effectId)
                  : null;
              const action =
                intent.kind === 'use-ability'
                  ? effectiveAbilities(state, instance(state, intent.card)).actions?.find(
                      a => a.id === intent.abilityId,
                    )
                  : null;
              const actionLabel =
                action && intent.kind === 'use-ability'
                  ? abilityIdentity(abilityOrigins(state, instance(state, intent.card)), action.id)
                  : null;
              const triggerLabel = trigger
                ? abilityIdentity(trigger.abilities, trigger.abilityId)
                : null;
              const definitions = trigger
                ? triggerDefinitions(state, trigger.source, trigger.abilities)
                : [];
              const definition = definitions.find(a => a.id === trigger?.abilityId);
              const siblings = definitions.filter(
                a =>
                  a.timing === definition?.timing &&
                  !/^(ambush|shielded-|support-|restore-|saboteur-)/.test(a.id),
              );
              const smuggle =
                intent.kind === 'play' && intent.smuggle
                  ? smuggleOptions(state, instance(state, intent.card)).find(
                      c => c.id === intent.smuggle,
                    )
                  : undefined;
              return {
                id: this.token('option', decision.id, option.id),
                kind: intent.kind,
                cards: refs.map(id => this.handle(instance(state, id))),
                playerId:
                  intent.kind === 'initiative' ||
                  intent.kind === 'choose-player' ||
                  intent.kind === 'trigger-player' ||
                  intent.kind === 'delayed-player'
                    ? intent.playerId
                    : null,
                delayed: delayed
                  ? {
                      source: visibleReference(delayed.source),
                      target: delayed.target ? visibleReference(delayed.target) : null,
                    }
                  : null,
                mode: intent.kind === 'choose-mode' ? intent.mode : null,
                piloting: intent.kind === 'play' ? (intent.piloting ?? null) : null,
                ...(intent.kind === 'play' &&
                frame?.kind === 'effect' &&
                (frame.effect.kind === 'plot-play' ||
                  (frame.effect.kind === 'play-card' && frame.effect.using === 'plot'))
                  ? {
                      plot: {
                        cost: paymentAmount(state, frame, intent, decision.playerId),
                        useOtherResources: !!intent.plotPayment,
                      },
                    }
                  : {}),
                exploit:
                  frame && exploitForIntent(state, frame, intent, decision.playerId)
                    ? {
                        maxUnits: exploitForIntent(state, frame, intent, decision.playerId),
                        costBeforeExploit: paymentAmount(state, frame, intent, decision.playerId),
                      }
                    : null,
                smuggle:
                  smuggle && frame
                    ? {
                        cost: paymentAmount(state, frame, intent, decision.playerId),
                        grantedBy: smuggle.source ? visibleReference(smuggle.source) : null,
                      }
                    : null,
                tokenCardId: intent.kind === 'choose-token' ? intent.token : null,
                takeMulligan: intent.kind === 'mulligan' ? intent.take : null,
                action: action
                  ? {
                      id: actionLabel?.id ?? action.id,
                      grantedBy: actionLabel?.origin ? visibleReference(actionLabel.origin) : null,
                      limit: action.limit,
                      deploymentAvailable: action.effects.some(
                        effect =>
                          effect.kind === 'deploy' &&
                          deployCondition(state, decision.playerId, effect),
                      ),
                      deploymentOnly:
                        action.effects.length > 0 && action.effects.every(e => e.kind === 'deploy'),
                    }
                  : null,
                ability: trigger
                  ? {
                      id: triggerLabel!.id,
                      timing: definition?.timing,
                      index: Math.max(
                        0,
                        siblings.findIndex(a => a.id === trigger.abilityId),
                      ),
                      source: visibleReference(trigger.source),
                      grantedBy: triggerLabel!.origin
                        ? visibleReference(triggerLabel!.origin)
                        : null,
                    }
                  : null,
              };
            }),
            selection: decision.selection
              ? {
                  ...(decision.selection.disclose
                    ? {
                        disclose: {
                          required: [...decision.selection.disclose.required],
                          icons: Object.fromEntries(
                            Object.entries(decision.selection.disclose.icons).map(([id, icons]) => [
                              this.handle(instance(state, id)),
                              icons,
                            ]),
                          ),
                        },
                      }
                    : {}),
                  ...(decision.selection.allocation
                    ? {
                        allocation: {
                          ...(decision.selection.allocation.quantum
                            ? { quantum: decision.selection.allocation.quantum }
                            : {}),
                          limits: Object.fromEntries(
                            Object.entries(decision.selection.allocation.limits).map(([id, n]) => [
                              this.handle(instance(state, id)),
                              n,
                            ]),
                          ),
                        },
                      }
                    : {}),
                  min: decision.selection.min,
                  max: decision.selection.max,
                  ...(decision.selection.budget
                    ? {
                        budget: {
                          ...(decision.selection.budget.stat
                            ? { stat: decision.selection.budget.stat }
                            : {}),
                          max: decision.selection.budget.max,
                          costs: Object.fromEntries(
                            Object.entries(decision.selection.budget.costs).map(([id, cost]) => [
                              this.handle(instance(state, id)),
                              cost,
                            ]),
                          ),
                        },
                      }
                    : {}),
                  cards: decision.selection.cards.map(id => this.handle(instance(state, id))),
                }
              : null,
          }
        : null,
    };
    const serialized = JSON.stringify(content);
    if (this.#lastContent && this.#lastContent !== serialized) this.#revision++;
    this.#lastContent = serialized;
    const view = { ...content, revision: this.#revision };
    if (plan && !plan.queuedResources && view.decision) {
      this.#earlyResource = {
        engineRevision: state.revision,
        viewRevision: view.revision,
        decision: view.decision,
        frame: JSON.stringify(plan),
      };
    } else if (
      !this.#earlyResource ||
      state.revision !== this.#earlyResource.engineRevision + 1 ||
      view.decision?.kind !== 'resource' ||
      plan ||
      JSON.stringify(frame) !== this.#earlyResource.frame ||
      JSON.stringify(view.decision.selection) !==
        JSON.stringify(this.#earlyResource.decision.selection)
    ) {
      this.#earlyResource = undefined;
    }
    return view;
  }

  command(state: GameState, raw: ViewCommand): EngineInput {
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success || this.#viewer.role !== 'player') throw new IllegalInput();
    const input = parsed.data,
      view = this.project(state),
      decision = decisionForPlayer(state, this.#viewer.playerId);
    // Both confirmations may be in flight. Only the immediately promoted,
    // unchanged resource choice can use its previously offered private handles.
    // Every other stale decision keeps the normal rejection/resync behavior.
    const early = this.#earlyResource;
    const promotedResource =
      early &&
      state.revision === early.engineRevision + 1 &&
      input.expectedRevision === early.viewRevision &&
      input.decisionId === early.decision.id &&
      input.optionId === early.decision.options[0]?.id &&
      decision?.options[0]?.intent.kind === 'resource';
    if (
      !decision ||
      decision.playerId !== this.#viewer.playerId ||
      input.gameId !== view.gameId ||
      input.epoch !== view.epoch ||
      (!promotedResource &&
        (input.expectedRevision !== view.revision || input.decisionId !== view.decision?.id))
    )
      throw new IllegalInput();
    const option = decision.options.find(option =>
      promotedResource
        ? option.intent.kind === 'resource'
        : this.token('option', decision.id, option.id) === input.optionId,
    );
    if (!option) throw new IllegalInput();
    const selections = input.selections.map(handle => {
      const id = decision.selection?.cards.find(id => this.handle(instance(state, id)) === handle);
      if (!id) throw new IllegalInput();
      return id;
    });
    return {
      type: 'decision',
      gameId: state.gameId,
      expectedRevision: state.revision,
      playerId: this.#viewer.playerId,
      decisionId: decision.id,
      optionId: option.id,
      selections,
      ...(input.namedCardId !== undefined ? { namedCardId: input.namedCardId } : {}),
      ...(input.chosenNumber !== undefined ? { chosenNumber: input.chosenNumber } : {}),
    };
  }
}
