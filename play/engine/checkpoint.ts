import { assertUnitDefeat } from './unit-defeat.ts';
import { explicitPlayedAbility, repeatedPlayedAbility } from './triggers.ts';
import { assertPhaseTriggers } from './phase-triggers.ts';
import { assertSequence } from './sequences.ts';
import { assertExploit } from './exploit.ts';
import { repeatedBounty, validBountyContext } from './bounty.ts';
import { assertUpgradeWork } from './upgrade-defeat.ts';
import { assertTokenCreation, assertCompoundDamage } from './token-creation.ts';
import {
  repeatedDefeatedAbility,
  repeatedAttackAbility,
  explicitAttackAbility,
} from './triggers.ts';
import { assertDamageReplacements } from './damage.ts';
import { combatOrderIntents } from './combat.ts';
import { historicalOwnerMatches } from './roles.ts';
import { controlSourceLeft } from './delayed.ts';
import { assertRandomCard } from './random-card.ts';
import { assertRandomDiscard } from './random-discard.ts';
import { assertAbilityPayment, abilityPaymentSelection } from './ability-payment.ts';
import { assertUnitTax, taxSelection } from './unit-tax.ts';
import { assertArrange } from './deck-order.ts';
import { assertZoneSearch } from './zone-search.ts';
import { catalogFor } from '../cards/catalog.ts';
import { preventionOptions } from './damage.ts';
import { paymentAmount } from './credits.ts';
import { actionIntents } from './actions.ts';
import { disclosePlayer } from './disclose.ts';
import { plotCards } from './plot.ts';
import { reference } from './state.ts';
import { assertInspection } from './inspection.ts';
import { assertAbilityOrigins } from './effective-abilities.ts';
import { attachedUpgrades, isUnit, sourcePower } from './attachments.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { assertSearch, randomBounds } from './search.ts';
import { decisionContext, frameIntents, frameSelection } from './actions.ts';
import { stateSchema } from './model.ts';
import type { Frame, GameState } from './model.ts';
import { assertState } from './state.ts';
import { triggerAvailable, triggerDefinitions, uniqueConflict } from './triggers.ts';

export function encodeState(state: GameState): string {
  return JSON.stringify(state);
}

export function decodeState(json: string): GameState {
  if (json.length > 8_000_000) throw new Error('Checkpoint too large');
  const state = stateSchema.parse(JSON.parse(json));
  assertState(state);
  assertExploit(state, decodeState);
  // Face snapshots can outlive a flip, but a snapshot of the current incarnation
  // must describe the current face. Validate persisted references off the hot path.
  function assertLeaderReferences(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    if ('instanceId' in value && 'cardId' in value && 'incarnation' in value) {
      const ref = value as {
        instanceId: string;
        cardId: string;
        incarnation: number;
        leaderSide?: 'back';
      };
      const definition = cardDefinition(state, ref.cardId);
      const current = state.cards[ref.instanceId];
      if (
        (ref.leaderSide && (definition.kind !== 'leader' || !definition.faces.alternate)) ||
        (definition.kind === 'leader' &&
          definition.faces.alternate &&
          current &&
          current.incarnation === ref.incarnation &&
          current.leaderSide !== ref.leaderSide)
      )
        throw new Error('Invalid leader face reference');
    }
    for (const child of Object.values(value)) assertLeaderReferences(child);
  }
  assertLeaderReferences(state);
  const { frames, decision, random } = state.execution;
  for (const frame of frames)
    if (frame.kind === 'resource' && frame.queuedResources) {
      if (
        new Set(frame.queuedResources.map(c => c.instanceId)).size !==
          frame.queuedResources.length ||
        frame.queuedResources.some(
          ref =>
            !state.cards[ref.instanceId] ||
            state.cards[ref.instanceId]!.owner !== frame.playerId ||
            ref.incarnation > state.cards[ref.instanceId]!.incarnation,
        )
      )
        throw new Error('Invalid private resource plan');
    }
  if (state.phase === 'ended') {
    if (frames.length || decision || random || state.execution.pendingTriggers.length)
      throw new Error('Finished checkpoint has pending work');
    return state;
  }
  const frame = frames[0];
  if (!frame || (!decision && !random)) throw new Error('Checkpoint is missing a suspension');
  const searched = frames.flatMap(f =>
    f.kind === 'finish-searched-play' && state.searching.includes(f.target.instanceId)
      ? [f.target.instanceId]
      : [],
  );
  if (
    new Set(searched).size !== searched.length ||
    searched.length !== state.searching.length ||
    state.searching.some(id => !searched.includes(id))
  )
    throw new Error('Invalid selected search cards');
  for (const item of frames)
    if (item.kind === 'credit-payment') {
      const selection =
        item.continuation.kind === 'unit-tax'
          ? taxSelection(state, item.continuation)
          : item.continuation.kind === 'ability-payment'
            ? abilityPaymentSelection(state, item.continuation)
            : null;
      const legal =
        item.continuation.kind === 'action'
          ? actionIntents(state)
          : frameIntents(state, item.continuation);
      if (
        item.amount <= 0 ||
        item.amount !==
          paymentAmount(state, item.continuation, item.intent, item.playerId, item.selections) ||
        (selection
          ? new Set(item.selections).size !== item.selections.length ||
            item.selections.length > selection.max ||
            (item.continuation.kind === 'ability-payment' &&
              item.selections.length < selection.min) ||
            item.selections.some(id => !selection.cards.includes(id))
          : item.selections.length > 0) ||
        item.playerId !==
          (item.continuation.kind === 'action'
            ? state.activePlayer
            : item.continuation.kind === 'unit-tax'
              ? item.continuation.chooser
              : item.continuation.kind === 'effect'
                ? decisionContext(state, item.continuation)?.playerId
                : item.continuation.playerId) ||
        !legal.some(i => JSON.stringify(i) === JSON.stringify(item.intent))
      )
        throw new Error('Invalid Credit payment');
    }
  for (const item of [...frames, ...state.attacks.flatMap(a => a.after ?? [])].flatMap<Frame>(f =>
    f.kind === 'credit-payment'
      ? [f, f.continuation]
      : f.kind === 'damage' && f.tokens
        ? [f, f.tokens]
        : [f],
  )) {
    if (item.kind === 'unit-defeat') assertUnitDefeat(state, item);
    if (item.kind === 'upgrade-defeat' || item.kind === 'convert-pilot')
      assertUpgradeWork(state, item);
    if (item.kind === 'create-tokens') assertTokenCreation(state, item);
    if (
      item.kind === 'disclose' &&
      item.chooser !== disclosePlayer(state, item.playerId, item.effect, item)
    )
      throw new Error('Invalid disclosure chooser');
    if (
      item.kind === 'plot-reveal' &&
      JSON.stringify(item.cards.map(reference)) !==
        JSON.stringify(plotCards(state, item.playerId).map(reference))
    )
      throw new Error('Invalid Plot declaration');
    if (
      item.kind === 'damage' &&
      item.combatAttackId &&
      state.attacks.at(-1)?.id !== item.combatAttackId
    )
      throw new Error('Invalid combat damage continuation');
    if (item.kind === 'finish-searched-play') {
      const card = state.cards[item.target.instanceId];
      if (
        !card ||
        card.cardId !== item.target.cardId ||
        card.incarnation < item.target.incarnation ||
        card.owner !== item.playerId
      )
        throw new Error('Invalid searched continuation');
    }
    if (
      item.kind === 'delayed-batch' &&
      item.effects.some(effect =>
        effect.kind === 'control-on-departure'
          ? !controlSourceLeft(state, effect)
          : effect.dueRound !== state.round ||
            state.phase !== (effect.kind === 'effects-at-action' ? 'action' : 'regroup'),
      )
    )
      throw new Error('Invalid delayed timing');
    if (
      item.kind === 'allocate-indirect' &&
      (!state.seats.includes(item.recipient) ||
        !state.seats.includes(item.assigner) ||
        !item.amount)
    )
      throw new Error('Invalid indirect allocation');
    if (
      item.kind === 'trigger-batch' &&
      item.chooseOne &&
      (item.playerId === null ||
        item.triggers.some(
          trigger =>
            trigger.playerId !== item.playerId ||
            !triggerDefinitions(state, trigger.source, trigger.abilities).some(
              ability => ability.id === trigger.abilityId && ability.timing === 'defeated',
            ),
        ))
    )
      throw new Error('Invalid invoked ability selection');
    if (item.kind === 'effect' && item.values?.['used-attack'] !== undefined)
      repeatedAttackAbility(state, item.playerId, item.values['used-attack']);
    if (
      item.kind === 'effect' &&
      (item.effect.kind === 'repeat-played-ability' || item.values?.['used-played'] !== undefined)
    )
      repeatedPlayedAbility(
        state,
        item.playerId,
        item.effect.kind === 'repeat-played-ability'
          ? item.values?.[item.effect.index]
          : item.values?.['used-played'],
      );
    if (item.kind === 'effect' && item.effect.kind === 'repeat-attack-ability')
      repeatedAttackAbility(state, item.playerId, item.values?.[item.effect.index]);
    if (item.kind === 'effect' && item.values?.['used-defeated'] !== undefined)
      repeatedDefeatedAbility(state, item.playerId, item.values['used-defeated']);
    if (item.kind === 'effect' && item.effect.kind === 'repeat-defeated-ability')
      repeatedDefeatedAbility(state, item.playerId, item.values?.[item.effect.index]);
    if (item.kind === 'optional-trigger') {
      const ability = triggerDefinitions(state, item.trigger.source, item.trigger.abilities).find(
        a => a.id === item.trigger.abilityId,
      );
      if (!ability?.optional || !triggerAvailable(state, item.trigger))
        throw new Error('Invalid optional trigger');
    }
    if (
      'values' in item &&
      item.values?.['bounty-context'] !== undefined &&
      'source' in item &&
      !validBountyContext(state, item.source, item.playerId, item.values['bounty-context'])
    )
      throw new Error('Invalid Bounty effect controller');
    if (item.kind === 'effect' && item.effect.kind === 'repeat-bounty')
      repeatedBounty(state, item.playerId, item.values?.[item.effect.index]);
    if (item.kind === 'ability-payment') assertAbilityPayment(state, item);
    if (item.kind === 'random-bottom') {
      if (
        !state.seats.includes(item.owner) ||
        new Set(item.cards.map(c => c.instanceId)).size !== item.cards.length ||
        item.cards.some(ref => {
          const c = state.cards[ref.instanceId];
          return (
            !c ||
            c.cardId !== ref.cardId ||
            c.owner !== item.owner ||
            c.zone !== 'deck' ||
            c.incarnation !== ref.incarnation ||
            c.visibility !== ref.visibility
          );
        })
      )
        throw new Error('Invalid random bottom group');
    }
    if (item.kind === 'capture-pairs' || item.kind === 'attack-series') assertSequence(state, item);
    if (item.kind === 'zone-inspection') assertInspection(state, item);
    if (item.kind === 'zone-search') assertZoneSearch(state, item);
    if (item.kind === 'unit-tax') assertUnitTax(state, item);
    if (item.kind === 'arrange-deck') assertArrange(state, item);
    if (item.kind === 'random-discard') assertRandomDiscard(state, item);
    if (item.kind === 'random-card') assertRandomCard(state, item);
    if (
      item.kind === 'combat-order' &&
      (!combatOrderIntents(state, item).length ||
        JSON.stringify(reference(state.cards[item.source.instanceId]!)) !==
          JSON.stringify(reference(item.source)) ||
        state.attacks.find(a => a.id === item.attackId)?.attacker.instanceId !==
          item.source.instanceId)
    )
      throw new Error('Invalid combat order choice');
    if ('origin' in item && item.origin) assertAbilityOrigins(state, [item.origin]);
    if (
      'names' in item &&
      item.names &&
      Object.values(item.names).some(name => !catalogFor(state).hasTitle(name))
    )
      throw new Error('Invalid named card context');
    if (item.kind === 'allocate-damage' && !item.amount) throw new Error('Invalid divided damage');
    if (
      (item.kind === 'create-tokens' ||
        item.kind === 'effect' ||
        item.kind === 'zone-inspection' ||
        item.kind === 'search' ||
        item.kind === 'search-shuffle' ||
        item.kind === 'zone-search' ||
        item.kind === 'allocate-benefit' ||
        item.kind === 'disclose') &&
      item.groups
    )
      for (const refs of Object.values(item.groups)) {
        if (new Set(refs.map(r => r.instanceId)).size !== refs.length)
          throw new Error('Duplicate group reference');
        for (const ref of refs) {
          const card = state.cards[ref.instanceId];
          if (!card || card.cardId !== ref.cardId || card.incarnation < ref.incarnation)
            throw new Error('Invalid group binding');
        }
      }
    if (
      (item.kind === 'create-tokens' ||
        item.kind === 'effect' ||
        item.kind === 'disclose' ||
        item.kind === 'zone-inspection' ||
        item.kind === 'search' ||
        item.kind === 'search-shuffle' ||
        item.kind === 'zone-search' ||
        item.kind === 'allocate-benefit' ||
        item.kind === 'allocate-damage') &&
      item.bindings
    )
      for (const [key, ref] of Object.entries(item.bindings)) {
        const current = state.cards[ref.instanceId];
        if (
          ['source', 'attached'].includes(key) ||
          !current ||
          current.cardId !== ref.cardId ||
          current.incarnation < ref.incarnation ||
          current.visibility < ref.visibility
        )
          throw new Error('Invalid effect binding');
      }
    if (item.kind === 'search' || item.kind === 'search-shuffle') assertSearch(state, item);
    if ('playerId' in item && item.playerId !== null && !state.seats.includes(item.playerId))
      throw new Error('Invalid frame player');
    if (
      item.kind === 'draw' &&
      (new Set(item.players).size !== item.players.length ||
        item.players.some(id => !state.seats.includes(id)))
    )
      throw new Error('Invalid draw players');
    if (
      item.kind !== 'unit-defeat' &&
      'source' in item &&
      (!Object.hasOwn(state.cards, item.source.instanceId) ||
        state.cards[item.source.instanceId]!.cardId !== item.source.cardId ||
        !state.seats.includes(item.source.controller) ||
        (item.source.controller !== item.playerId &&
          !validBountyContext(
            state,
            item.source,
            item.playerId,
            'values' in item ? item.values?.['bounty-context'] : undefined,
          )) ||
        !historicalOwnerMatches(state, state.cards[item.source.instanceId]!, item.source) ||
        item.source.incarnation > state.cards[item.source.instanceId]!.incarnation)
    )
      throw new Error('Invalid effect source');
    if (
      item.kind === 'effect' &&
      item.effect.kind === 'damage-unit' &&
      item.effect.amount === 'source-power'
    )
      sourcePower(state, item.source);
    if (
      (item.kind === 'combat' || item.kind === 'combat-response') &&
      !state.attacks.some(attack => attack.id === item.attackId)
    )
      throw new Error('Invalid combat references');
    if (item.kind === 'combat-response' && !state.attacks.find(a => a.id === item.attackId)?.ending)
      throw new Error('Unstarted combat response');
    if (item.kind === 'damage') {
      assertCompoundDamage(state, item);
      assertDamageReplacements(state, item);
      if (item.actor !== null && !state.seats.includes(item.actor))
        throw new Error('Invalid damage actor');
      const used = new Set<string>();
      for (const assignment of item.assignments) {
        if (
          (assignment.indirect && !assignment.unpreventable) ||
          (assignment.unpreventable && assignment.preventedBy)
        )
          throw new Error('Invalid unpreventable damage');
        const target = state.cards[assignment.target.instanceId];
        if (
          !target ||
          target.cardId !== assignment.target.cardId ||
          target.incarnation !== assignment.target.incarnation ||
          (!isUnit(state, target) && cardDefinition(state, target.cardId).kind !== 'base')
        )
          throw new Error('Invalid damage target');
        if (assignment.redirectedAmount) {
          const attack = state.attacks.find(a => a.id === item.combatAttackId);
          if (
            !attack?.excessToUnit ||
            assignment.excessRoute ||
            assignment.target.instanceId !== attack.defender.instanceId ||
            assignment.source?.instanceId !== attack.attacker.instanceId ||
            (!attack.routedExcess && assignment.excess?.amount !== assignment.redirectedAmount)
          )
            throw Error('Invalid split combat damage');
        }
        if (assignment.excessRoute) {
          const attack = state.attacks.find(a => a.id === item.combatAttackId),
            route = assignment.excessRoute;
          if (
            !attack?.excessToUnit ||
            attack.routedExcess ||
            JSON.stringify(route.source) !== JSON.stringify(attack.excessToUnit.source) ||
            route.arena !== attack.excessToUnit.arena ||
            assignment.source?.instanceId !== attack.attacker.instanceId ||
            assignment.source.incarnation !== attack.attacker.incarnation ||
            (route.whole
              ? assignment.excess !== undefined ||
                target.instanceId !== state.players[attack.defendingPlayer]!.base
              : assignment.excess !== undefined ||
                assignment.target.instanceId !== attack.defender.instanceId)
          )
            throw Error('Invalid excess damage continuation');
        }
        if (assignment.excess) {
          const base = state.cards[assignment.excess.target.instanceId];
          if (
            !base ||
            base.cardId !== assignment.excess.target.cardId ||
            base.incarnation !== assignment.excess.target.incarnation ||
            cardDefinition(state, base.cardId).kind !== 'base' ||
            !assignment.excess.amount
          )
            throw new Error('Invalid excess damage target');
        }
        if (assignment.source) {
          const current = state.cards[assignment.source.instanceId];
          if (
            !current ||
            current.cardId !== assignment.source.cardId ||
            current.incarnation < assignment.source.incarnation ||
            !state.seats.includes(assignment.source.controller)
          )
            throw new Error('Invalid damage source');
        }
        if (
          (assignment.prevention && !assignment.preventedBy) ||
          (assignment.preventionDeclined && assignment.preventedBy)
        )
          throw new Error('Invalid damage replacement state');
        const options = preventionOptions(state, target, used);
        if (assignment.preventionDeclined && options.some(o => o.kind === 'shield'))
          throw new Error('Cannot decline mandatory Shield replacement');
        if (assignment.preventedBy) {
          const ref = assignment.preventedBy;
          const option = options.find(
            o =>
              o.card.instanceId === ref.instanceId &&
              o.card.incarnation === ref.incarnation &&
              o.card.cardId === ref.cardId &&
              o.kind === (assignment.prevention?.kind ?? 'shield'),
          );
          if (
            !assignment.amount ||
            !option ||
            (assignment.prevention &&
              JSON.stringify(reference(option.source)) !==
                JSON.stringify(reference(assignment.prevention.source)))
          )
            throw new Error('Invalid damage replacement');
          used.add(ref.instanceId);
        }
      }
    }
  }
  assertPhaseTriggers(state);
  for (const batch of state.defeatedAbilityBatches) {
    const current = state.cards[batch.unit.instanceId];
    if (
      !current ||
      current.cardId !== batch.unit.cardId ||
      current.incarnation < batch.unit.incarnation ||
      !historicalOwnerMatches(state, current, batch.unit) ||
      !isUnit(state, batch.unit) ||
      !state.seats.includes(batch.unit.controller) ||
      batch.triggers.some(
        t =>
          t.source.instanceId !== batch.unit.instanceId ||
          t.source.incarnation !== batch.unit.incarnation ||
          t.playerId !== batch.unit.controller,
      )
    )
      throw Error('Invalid defeated ability group');
  }

  for (const trigger of [
    ...state.defeatedAbilityBatches.flatMap(b => b.triggers),
    ...state.usedDefeatedAbilities,
    ...state.usedAttackAbilities,
    ...state.usedPlayedAbilities,
    ...state.phaseTriggers.map(e => e.trigger),
    ...state.usedBounties,
    ...state.execution.pendingTriggers,
    ...frames.flatMap(frame =>
      frame.kind === 'trigger-batch' || frame.kind === 'queue-triggers'
        ? frame.triggers
        : frame.kind === 'optional-trigger'
          ? [frame.trigger]
          : [],
    ),
  ]) {
    if (Object.values(trigger.names ?? {}).some(name => !catalogFor(state).hasTitle(name)))
      throw new Error('Invalid trigger named context');
    for (const refs of [
      Object.values(trigger.bindings ?? {}),
      ...Object.values(trigger.groups ?? {}),
    ]) {
      const seen = new Set<string>();
      for (const ref of refs) {
        const card = state.cards[ref.instanceId];
        if (
          !card ||
          card.cardId !== ref.cardId ||
          card.incarnation < ref.incarnation ||
          card.visibility < ref.visibility ||
          seen.has(ref.instanceId)
        )
          throw new Error('Invalid trigger context reference');
        seen.add(ref.instanceId);
      }
    }
    assertAbilityOrigins(state, trigger.abilities);
    const self = trigger.abilities.find(origin => origin.id === 'self');
    if (
      !self ||
      self.profile !== 'printed' ||
      self.withoutSupport ||
      JSON.stringify(self.card) !== JSON.stringify(trigger.source)
    )
      throw new Error('Invalid trigger self origin');
    if (trigger.subject) {
      const subject = state.cards[trigger.subject.instanceId];
      if (
        !subject ||
        subject.cardId !== trigger.subject.cardId ||
        !historicalOwnerMatches(state, subject, trigger.subject) ||
        subject.incarnation < trigger.subject.incarnation ||
        !state.seats.includes(trigger.subject.controller)
      )
        throw new Error('Invalid trigger subject');
    }
    const current = state.cards[trigger.source.instanceId];
    if (
      !current ||
      current.cardId !== trigger.source.cardId ||
      trigger.source.incarnation > current.incarnation ||
      trigger.playerId !==
        (triggerDefinitions(state, trigger.source, trigger.abilities).find(
          a => a.id === trigger.abilityId,
        )?.timing === 'bounty'
          ? state.seats.find(p => p !== trigger.source.controller)
          : trigger.source.controller) ||
      !state.seats.includes(trigger.playerId) ||
      !triggerDefinitions(state, trigger.source, trigger.abilities).some(
        ability => ability.id === trigger.abilityId,
      )
    )
      throw new Error('Invalid pending trigger');
    const ability = triggerDefinitions(state, trigger.source, trigger.abilities).find(
      a => a.id === trigger.abilityId,
    )!;
    if (
      (state.usedDefeatedAbilities.includes(trigger) ||
        state.defeatedAbilityBatches.some(b => b.triggers.includes(trigger))) &&
      ability.timing !== 'defeated'
    )
      throw new Error('Invalid used defeat ability history');
    if (ability.timing === 'friendly-defeated' && trigger.values?.['defeat-batch'] !== undefined) {
      const batch = state.defeatedAbilityBatches[trigger.values['defeat-batch']];
      if (
        !batch ||
        batch.unit.controller !== trigger.playerId ||
        batch.unit.instanceId !== trigger.subject?.instanceId ||
        batch.unit.incarnation !== trigger.subject.incarnation
      )
        throw Error('Invalid defeated group observer');
    }
    if (state.usedBounties.includes(trigger) && ability.timing !== 'bounty')
      throw new Error('Invalid Bounty history');
    if (ability.timing === 'bounty-collected') {
      const used = repeatedBounty(state, trigger.playerId, trigger.values?.['used-bounty']);
      if (
        !trigger.subject ||
        trigger.subject.instanceId !== used.source.instanceId ||
        trigger.subject.incarnation !== used.source.incarnation
      )
        throw new Error('Invalid Bounty observer');
    }
    if (state.usedPlayedAbilities.includes(trigger) && !explicitPlayedAbility(state, trigger))
      throw new Error('Invalid used played ability history');
    if (
      ability.timing === 'played-ability-used' &&
      !state.phaseTriggers.some(e => e.trigger === trigger)
    ) {
      const used = repeatedPlayedAbility(state, trigger.playerId, trigger.values?.['used-played']);
      if (
        !trigger.subject ||
        trigger.subject.instanceId !== used.source.instanceId ||
        trigger.subject.incarnation !== used.source.incarnation
      )
        throw new Error('Invalid played ability observer');
    }
    if (state.usedAttackAbilities.includes(trigger) && !explicitAttackAbility(state, trigger))
      throw new Error('Invalid used attack ability history');
    if (ability.timing === 'attack-ability-used') {
      const used = repeatedAttackAbility(state, trigger.playerId, trigger.values?.['used-attack']);
      if (
        !trigger.subject ||
        trigger.subject.instanceId !== used.source.instanceId ||
        trigger.subject.incarnation !== used.source.incarnation
      )
        throw new Error('Invalid attack ability observer');
    }
    if (ability.timing === 'defeated-ability-used') {
      const used = repeatedDefeatedAbility(
        state,
        trigger.playerId,
        trigger.values?.['used-defeated'],
      );
      if (
        !trigger.subject ||
        trigger.subject.instanceId !== used.source.instanceId ||
        trigger.subject.incarnation !== used.source.incarnation
      )
        throw new Error('Invalid defeat ability observer');
    }

    if (
      ability.effects.some(
        effect => effect.kind === 'damage-unit' && effect.amount === 'source-power',
      )
    )
      sourcePower(state, trigger.source);
  }
  if (
    frame.kind === 'unique' &&
    JSON.stringify({ playerId: frame.playerId, cards: frame.cards }) !==
      JSON.stringify(uniqueConflict(state))
  )
    throw new Error('Invalid uniqueness choice');
  if (random) {
    const bounds = randomBounds(state, frame);
    if (JSON.stringify(random.bounds) !== JSON.stringify(bounds))
      throw new Error('Invalid random bounds');
  }
  if (decision) {
    const context = decisionContext(state, frame);
    const actor = context?.playerId;
    if (
      !context ||
      decision.kind !== context.kind ||
      decision.playerId !== actor ||
      !state.seats.includes(actor!)
    )
      throw new Error('Invalid decision owner/kind');
    if (frame.kind === 'action' && state.phase !== 'action')
      throw new Error('Action outside action phase');
    if (frame.kind === 'action' && state.initiative.claimed && state.initiative.holder === actor)
      throw new Error('Claimed initiative player must pass');
    const options = frameIntents(state, frame).map((intent, i) => ({ id: `o${i}`, intent }));
    if (JSON.stringify(options) !== JSON.stringify(decision.options))
      throw new Error('Invalid checkpoint choices');
    const selection = frameSelection(state, frame, actor!);
    if (JSON.stringify(selection) !== JSON.stringify(decision.selection))
      throw new Error('Invalid checkpoint selection');
  }
  return state;
}
