import { losesOwnAbilities } from './lasting.ts';
import { activeLasting, survivesZeroHp } from './lasting.ts';
import { upgradeProfile } from './roles.ts';
import { recordPhasePlayer } from './phase-history.ts';
import { namedAbilityLoss } from './naming.ts';
import { cardTraits } from './attributes.ts';
import { effectiveAbilities, abilityOrigins } from './effective-abilities.ts';
import {
  abilitySources,
  collectTriggers,
  triggerObservers,
  declaredTriggerObservers,
} from './triggers.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { attachedUpgrades, defeatUpgrade, isUnit, unitStats } from './attachments.ts';
import type { CardInstance, Frame, GameState } from './model.ts';
import { fact, instance, reference } from './state.ts';

export type DamageFrame = Extract<Frame, { kind: 'damage' }>;
export type PreventionOption = {
  card: CardInstance;
  source: CardInstance;
  kind:
    | 'shield'
    | 'sacrifice-trait'
    | 'shield-other'
    | 'double'
    | 'prevent-next'
    | 'prevent'
    | 'increase';
  abilityId?: string;
  amount?: number;
  lastingId?: string;
};
export function damageIsUnpreventable(
  state: GameState,
  source: CardInstance | null | undefined,
): boolean {
  if (!source) return false;
  const traits = cardTraits(state, source, undefined, true);
  return abilitySources(state).some(
    host =>
      host.controller === source.controller &&
      effectiveAbilities(state, host).unpreventableDamageTraits?.some(trait =>
        traits.includes(trait),
      ),
  );
}
export function preventionOptions(
  state: GameState,
  target: CardInstance,
  reserved: ReadonlySet<string>,
): PreventionOption[] {
  if (!isUnit(state, target)) return [];
  const shields = (unit: CardInstance) =>
    attachedUpgrades(state, unit).filter(card => {
      const definition = cardDefinition(state, card.cardId);
      return (
        definition.kind === 'upgrade' &&
        definition.replacement?.kind === 'shield' &&
        !reserved.has(card.instanceId)
      );
    });
  const options: PreventionOption[] = shields(target)
    .filter(card => !namedAbilityLoss(state, card))
    .map(card => ({
      card,
      source: card,
      kind: 'shield',
    }));
  const units = [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(card => isUnit(state, card));
  if (effectiveAbilities(state, target).preventSelfByTraitSacrifice) {
    const traits = cardTraits(state, target);
    for (const card of units)
      if (
        card.controller === target.controller &&
        card.instanceId !== target.instanceId &&
        !reserved.has(card.instanceId) &&
        cardTraits(state, card).some(t => traits.includes(t))
      )
        options.push({ card, source: target, kind: 'sacrifice-trait' });
  }
  for (const host of units)
    if (
      host.controller === target.controller &&
      host.instanceId !== target.instanceId &&
      effectiveAbilities(state, host).preventFriendlyByShield
    )
      options.push(
        ...shields(host).map(card => ({ card, source: host, kind: 'shield-other' as const })),
      );
  return options;
}
// Every replacement sees the damage left by the chosen earlier replacements.
// Full prevention ends that packet; one-use effects and payment cards are
// reserved across simultaneous assignments until the damage event is applied.
function damageOptions(
  state: GameState,
  assignment: DamageFrame['assignments'][number],
  reserved: ReadonlySet<string>,
  frame: DamageFrame,
): PreventionOption[] {
  const target = instance(state, assignment.target.instanceId);
  const applied = assignment.replacements ?? [];
  const options: PreventionOption[] = assignment.unpreventable
    ? []
    : preventionOptions(state, target, reserved);
  for (const upgrade of attachedUpgrades(state, target))
    if (
      !losesOwnAbilities(state, upgrade) &&
      upgradeProfile(cardDefinition(state, upgrade.cardId))?.doubleHostDamage &&
      !applied.some(
        r =>
          r.kind === 'double' &&
          r.source.instanceId === upgrade.instanceId &&
          r.source.incarnation === upgrade.incarnation,
      )
    )
      options.push({ card: upgrade, source: upgrade, kind: 'double', amount: 2 });
  if (!assignment.unpreventable)
    for (const lasting of activeLasting(state, target))
      if (lasting.preventNextDamage && !reserved.has(lasting.id))
        options.push({
          card: lasting.source,
          source: lasting.source,
          kind: 'prevent-next',
          amount:
            lasting.preventNextDamage === 'all' ? assignment.amount : lasting.preventNextDamage,
          lastingId: lasting.id,
        });
  if (!assignment.unpreventable)
    for (const lasting of activeLasting(state, target))
      if (lasting.preventAllDamage && !applied.some(r => r.abilityId === lasting.id))
        options.push({
          card: lasting.source,
          source: lasting.source,
          kind: 'prevent',
          amount: assignment.amount,
          abilityId: lasting.id,
        });
  // Printed damage replacement rules below target units. Bases use direct effects.
  if (!isUnit(state, target)) return options;
  const first =
    !state.phaseHistory.damageAttempts.some(
      r => r.instanceId === target.instanceId && r.incarnation === target.incarnation,
    ) &&
    !frame.assignments
      .slice(
        0,
        frame.assignments.findIndex(a => a.target === assignment.target),
      )
      .some(
        a =>
          a.target.instanceId === target.instanceId &&
          a.target.incarnation === target.incarnation &&
          (a.originalAmount ?? a.amount) > 0,
      );
  for (const host of abilitySources(state))
    for (const rule of effectiveAbilities(state, host).damageReplacements ?? []) {
      const self = host.instanceId === target.instanceId && host.incarnation === target.incarnation;
      if (
        (rule.target === 'self'
          ? !self
          : host.controller !== target.controller || (rule.target === 'other-friendly' && self)) ||
        (rule.friendlySourceTrait &&
          (!isUnit(state, target) ||
            !assignment.source ||
            !isUnit(state, assignment.source) ||
            assignment.source.controller !== host.controller ||
            !cardTraits(state, assignment.source, undefined, true).includes(
              rule.friendlySourceTrait,
            ))) ||
        (rule.enemyAbilityOnly &&
          (frame.combatAttackId ||
            !assignment.source ||
            (frame.actor ?? assignment.source.controller) === target.controller)) ||
        (rule.otherSourceOnly &&
          (!assignment.source ||
            (assignment.source.instanceId === host.instanceId &&
              assignment.source.incarnation === host.incarnation))) ||
        (rule.firstEachPhase && !first) ||
        (rule.operation === 'prevent' && assignment.unpreventable) ||
        applied.some(
          r =>
            r.source.instanceId === host.instanceId &&
            r.source.incarnation === host.incarnation &&
            r.abilityId === rule.id,
        )
      )
        continue;
      options.push({
        card: host,
        source: host,
        kind: rule.operation,
        amount: rule.amount === 'all' ? assignment.amount : rule.amount,
        abilityId: rule.id,
      });
    }
  return options;
}
export function damagePreventionChoice(state: GameState, frame: DamageFrame) {
  const reserved = new Set(
    frame.assignments.flatMap(a => [
      ...(a.preventedBy ? [a.preventedBy.instanceId] : []),
      ...(a.replacements ?? []).flatMap(r => (r.lastingId ? [r.lastingId] : [])),
    ]),
  );
  for (const assignment of frame.assignments) {
    const target = instance(state, assignment.target.instanceId);
    if (
      !assignment.amount ||
      assignment.preventedBy ||
      assignment.preventionDeclined ||
      target.incarnation !== assignment.target.incarnation ||
      (!isUnit(state, target) && cardDefinition(state, target.cardId).kind !== 'base')
    )
      continue;
    const options = damageOptions(state, assignment, reserved, frame);
    if (options.length)
      return {
        assignment,
        target,
        options,
        mandatory: options.some(
          o =>
            o.kind === 'shield' ||
            o.kind === 'double' ||
            o.kind === 'prevent-next' ||
            o.kind === 'prevent' ||
            o.kind === 'increase',
        ),
      };
  }
  return null;
}
export function reservePrevention(
  assignment: DamageFrame['assignments'][number],
  option: PreventionOption,
) {
  if (
    option.kind === 'double' ||
    option.kind === 'prevent-next' ||
    option.kind === 'prevent' ||
    option.kind === 'increase'
  ) {
    assignment.originalAmount ??= assignment.amount;
    (assignment.replacements ??= []).push({
      kind: option.kind,
      source: reference(option.source),
      amount: option.amount!,
      ...(option.abilityId ? { abilityId: option.abilityId } : {}),
      ...(option.lastingId ? { lastingId: option.lastingId } : {}),
    });
    assignment.amount =
      option.kind === 'double'
        ? assignment.amount * option.amount!
        : option.kind === 'increase'
          ? assignment.amount + option.amount!
          : Math.max(0, assignment.amount - option.amount!);
  } else {
    assignment.preventedBy = reference(option.card);
    if (option.kind !== 'shield')
      assignment.prevention = { kind: option.kind, source: reference(option.source) };
  }
}
export function assertDamageReplacements(state: GameState, frame: DamageFrame) {
  const reserved = new Set<string>();
  for (const assignment of frame.assignments) {
    const steps = assignment.replacements ?? [];
    if ((assignment.originalAmount !== undefined) !== steps.length > 0)
      throw new Error('Invalid damage replacement history');
    const replay = {
      ...assignment,
      amount: assignment.originalAmount ?? assignment.amount + (assignment.redirectedAmount ?? 0),
      replacements: [] as NonNullable<typeof assignment.replacements>,
    };
    for (const step of steps) {
      const option = damageOptions(state, replay, reserved, frame).find(
        o =>
          o.kind === step.kind &&
          o.source.instanceId === step.source.instanceId &&
          o.source.incarnation === step.source.incarnation &&
          o.source.cardId === step.source.cardId &&
          o.source.visibility === step.source.visibility &&
          o.abilityId === step.abilityId &&
          o.lastingId === step.lastingId &&
          o.amount === step.amount,
      );
      if (!option || !replay.amount) throw new Error('Invalid damage transformation');
      reservePrevention(replay, option);
      if (step.lastingId) reserved.add(step.lastingId);
    }
    if (replay.amount !== assignment.amount + (assignment.redirectedAmount ?? 0))
      throw new Error('Invalid transformed damage amount');
    if (
      assignment.preventionDeclined &&
      damageOptions(state, assignment, reserved, frame).some(
        o =>
          o.kind === 'shield' ||
          o.kind === 'double' ||
          o.kind === 'prevent-next' ||
          o.kind === 'prevent' ||
          o.kind === 'increase',
      )
    )
      throw new Error('Cannot decline mandatory damage replacement');
  }
}
function recordBaseDamage(state: GameState, source: CardInstance | null | undefined) {
  if (source && isUnit(state, source))
    for (const attack of state.attacks) {
      if (
        !attack.baseDamageSources.some(
          r => r.instanceId === source.instanceId && r.incarnation === source.incarnation,
        )
      )
        attack.baseDamageSources.push(reference(source));
    }
  if (
    source &&
    isUnit(state, source) &&
    !state.phaseHistory.baseDamageSources.some(
      r => r.instanceId === source.instanceId && r.incarnation === source.incarnation,
    )
  )
    state.phaseHistory.baseDamageSources.push(reference(source));
}
export function applyDamage(state: GameState, frame: DamageFrame) {
  for (const assignment of frame.assignments) {
    const target = state.cards[assignment.target.instanceId];
    if (
      (assignment.originalAmount ?? assignment.amount) > 0 &&
      target &&
      isUnit(state, target) &&
      target.incarnation === assignment.target.incarnation &&
      !state.phaseHistory.damageAttempts.some(
        r => r.instanceId === target.instanceId && r.incarnation === target.incarnation,
      )
    )
      state.phaseHistory.damageAttempts.push(reference(target));
  }
  const limits = new Map<string, { amount: number; source: CardInstance }>();
  for (const source of abilitySources(state)) {
    const amount = effectiveAbilities(state, source).baseDamageLimit;
    if (
      amount !== undefined &&
      amount < (limits.get(source.controller)?.amount ?? Number.MAX_SAFE_INTEGER)
    )
      limits.set(source.controller, { amount, source: structuredClone(source) });
  }
  const cap = (target: CardInstance, amount: number, unpreventable?: boolean) => {
    const limit = limits.get(target.controller);
    if (
      unpreventable ||
      cardDefinition(state, target.cardId).kind !== 'base' ||
      !limit ||
      amount <= limit.amount
    )
      return amount;
    fact(
      state,
      'damage-prevented',
      target.controller,
      [limit.source, target],
      amount - limit.amount,
    );
    return limit.amount;
  };
  // Consume once-only prevention as part of this event, including a packet
  // reduced to zero. Choosing a Shield first leaves these effects unused.
  for (const assignment of frame.assignments) {
    let amount = assignment.originalAmount ?? assignment.amount;
    for (const replacement of assignment.replacements ?? []) {
      if (replacement.kind === 'double') amount *= replacement.amount;
      else if (replacement.kind === 'increase') amount += replacement.amount;
      else {
        const prevented = Math.min(amount, replacement.amount);
        amount -= prevented;
        state.lastingEffects = state.lastingEffects.filter(e => e.id !== replacement.lastingId);
        fact(
          state,
          'damage-prevented',
          state.cards[assignment.target.instanceId]!.controller,
          [replacement.source, assignment.target],
          prevented,
        );
      }
    }
  }

  const nonCombatPlayers = new Set<string>();
  const beforeDamage = frame.combatAttackId
    ? []
    : abilitySources(state).map(source => ({
        source: structuredClone(source),
        origins: abilityOrigins(state, source),
      }));
  const baseObservers = frame.assignments.some(
    a => a.excess || cardDefinition(state, a.target.cardId).kind === 'base',
  )
    ? state.seats.flatMap(player => triggerObservers(state, 'own-base-damaged', player))
    : [];
  const enemyBaseObservers = frame.assignments.some(
    a => a.excess || cardDefinition(state, a.target.cardId).kind === 'base',
  )
    ? declaredTriggerObservers(state, 'enemy-base-damage')
    : [];
  const baseEvents: {
    target: CardInstance;
    source: CardInstance | null;
    amount: number;
    origins: ReturnType<typeof abilityOrigins>;
  }[] = [];
  const friendlyCombatObservers = frame.combatAttackId
    ? state.seats.flatMap(player =>
        triggerObservers(state, 'friendly-combat-base-damage-dealt', player),
      )
    : [];
  const dealtBaseEvents: { target: CardInstance; dealer: string; amount: number }[] = [];
  const recordBaseEvent = (target: CardInstance, source: CardInstance | null, amount: number) => {
    if (amount > 0) recordPhasePlayer(state.phaseHistory.basesDamaged, target.controller);
    if (amount > 0)
      for (const dealer of new Set(
        [source?.controller, frame.actor].filter(
          (p): p is string => !!p && p !== target.controller,
        ),
      )) {
        state.phaseHistory.enemyBaseDamage[dealer] =
          (state.phaseHistory.enemyBaseDamage[dealer] ?? 0) + amount;
        dealtBaseEvents.push({ target: structuredClone(target), dealer, amount });
      }
    const live = source && state.cards[source.instanceId];
    const unit =
      live && live.incarnation === source!.incarnation && isUnit(state, live) ? live : null;
    baseEvents.push({
      target: structuredClone(target),
      source: unit ? structuredClone(unit) : null,
      amount,
      origins: unit ? abilityOrigins(state, unit) : [],
    });
  };
  const unitDamageObservers = frame.assignments.some(assignment => {
    const target = state.cards[assignment.target.instanceId];
    return (
      assignment.amount > 0 &&
      !assignment.preventedBy &&
      assignment.source &&
      isUnit(state, assignment.source) &&
      target &&
      isUnit(state, target) &&
      target.incarnation === assignment.target.incarnation &&
      target.controller !== assignment.source.controller
    );
  })
    ? state.seats.flatMap(player => triggerObservers(state, 'friendly-unit-damage', player))
    : [];
  const unitDamage: {
    target: import('./model.ts').CardReference;
    amount: number;
    source: CardInstance | null;
  }[] = [];
  const damaged: CardInstance[] = [];
  const sacrificed: CardInstance[] = [];
  const attack = frame.combatAttackId
    ? state.attacks.find(a => a.id === frame.combatAttackId)
    : undefined;
  for (const assignment of frame.assignments) {
    const target = instance(state, assignment.target.instanceId);
    if (
      target.incarnation !== assignment.target.incarnation ||
      (!isUnit(state, target) && cardDefinition(state, target.cardId).kind !== 'base')
    )
      continue;
    if (!assignment.amount) continue;
    assignment.amount = cap(target, assignment.amount, assignment.unpreventable);
    if (
      assignment.excess &&
      (survivesZeroHp(state, target) ||
        assignment.amount < unitStats(state, target).hp - target.damage)
    )
      delete assignment.excess;
    if (assignment.excess && !assignment.preventedBy) {
      const base = instance(state, assignment.excess.target.instanceId);
      assignment.excess.amount = cap(base, assignment.excess.amount, assignment.unpreventable);
    }

    if (assignment.preventedBy) {
      const shield = instance(state, assignment.preventedBy.instanceId);
      fact(
        state,
        'damage-prevented',
        target.controller,
        [shield, target],
        assignment.amount + (assignment.excess?.amount ?? 0),
      );
      if (assignment.prevention?.kind === 'sacrifice-trait') sacrificed.push(shield);
      else defeatUpgrade(state, shield);
    } else {
      target.damage += assignment.amount;
      const dealer = assignment.source?.controller ?? frame.actor;
      if (dealer && assignment.indirect)
        recordPhasePlayer(state.phaseHistory.indirectDamage, dealer);
      if (
        dealer &&
        cardDefinition(state, target.cardId).kind === 'base' &&
        target.controller !== dealer
      )
        recordPhasePlayer(state.phaseHistory.enemyBaseDamaged, dealer);
      if (!frame.combatAttackId && assignment.source) {
        nonCombatPlayers.add(assignment.source.controller);
        if (frame.actor) nonCombatPlayers.add(frame.actor);
      }
      if (cardDefinition(state, target.cardId).kind === 'base') {
        recordBaseDamage(state, assignment.source);
        recordBaseEvent(target, assignment.source, assignment.amount);
      }
      if (isUnit(state, target)) {
        if (
          assignment.amount > 0 &&
          !state.phaseHistory.damagedUnits.some(
            ref => ref.instanceId === target.instanceId && ref.incarnation === target.incarnation,
          )
        )
          state.phaseHistory.damagedUnits.push(reference(target));
        damaged.push(target);
        unitDamage.push({
          target: reference(target),
          amount: assignment.amount,
          source: assignment.source,
        });
      }
      if (attack && assignment.source)
        attack.combatDamage.push({
          source: reference(assignment.source),
          target: reference(target),
          amount: assignment.amount,
        });
      const source: CardInstance | null = assignment.source;
      fact(
        state,
        'damage',
        source?.controller ?? frame.actor,
        source ? [source, target] : [target],
        assignment.amount,
      );
      if (assignment.excess) {
        const base = instance(state, assignment.excess.target.instanceId);
        base.damage += assignment.excess.amount;
        if (dealer && assignment.excess.amount > 0 && base.controller !== dealer)
          recordPhasePlayer(state.phaseHistory.enemyBaseDamaged, dealer);
        recordBaseDamage(state, assignment.source);
        recordBaseEvent(base, assignment.source, assignment.excess.amount);
        if (attack && assignment.source)
          attack.combatDamage.push({
            source: reference(assignment.source),
            target: reference(base),
            amount: assignment.excess.amount,
          });
        fact(
          state,
          'damage',
          source?.controller ?? frame.actor,
          source ? [source, base] : [base],
          assignment.excess.amount,
        );
      }
    }
  }
  for (const event of unitDamage) {
    const target = state.cards[event.target.instanceId]!;
    collectTriggers(state, 'damaged', [target], undefined, { values: { damage: event.amount } });
    if (
      !event.source ||
      !isUnit(state, event.source) ||
      target.controller === event.source.controller
    )
      continue;
    for (const observer of unitDamageObservers.filter(
      o => o.source.controller === event.source!.controller,
    ))
      collectTriggers(state, 'friendly-unit-damage', [observer.source], target, {
        origins: observer.origins,
        bindings: { dealer: reference(event.source) },
        values: { damage: event.amount },
      });
  }
  for (const event of dealtBaseEvents)
    for (const observer of enemyBaseObservers.filter(o => o.source.controller === event.dealer))
      collectTriggers(state, 'enemy-base-damage', [observer.source], event.target, {
        origins: observer.origins,
        values: { 'base-damage': event.amount },
      });
  if (attack)
    for (const event of unitDamage) {
      const dealer = event.source && state.cards[event.source.instanceId];
      if (
        dealer &&
        isUnit(state, dealer) &&
        dealer.incarnation === event.source!.incarnation &&
        dealer.instanceId === attack.attacker.instanceId &&
        dealer.incarnation === attack.attacker.incarnation
      )
        collectTriggers(state, 'attacking-unit-damage-dealt', [dealer], undefined, {
          bindings: { 'damaged-unit': event.target },
        });
    }
  for (const event of baseEvents) {
    const context = {
      bindings: { 'damaged-base': reference(event.target) },
      values: {
        'base-damage': event.amount,
        'enemy-combat-damage': Number(
          !!attack && !!event.source && event.source.controller !== event.target.controller,
        ),
      },
    };
    for (const observer of baseObservers.filter(
      o => o.source.controller === event.target.controller,
    ))
      collectTriggers(state, 'own-base-damaged', [observer.source], undefined, {
        ...context,
        origins: observer.origins,
      });
    if (event.source) {
      collectTriggers(state, 'base-damage-dealt', [event.source], undefined, {
        ...context,
        origins: event.origins,
      });
      if (attack)
        collectTriggers(state, 'combat-base-damage-dealt', [event.source], undefined, {
          ...context,
          origins: event.origins,
        });
      if (attack && event.target.controller !== event.source.controller)
        for (const observer of friendlyCombatObservers.filter(
          o => o.source.controller === event.source!.controller,
        ))
          collectTriggers(
            state,
            'friendly-combat-base-damage-dealt',
            [observer.source],
            event.source,
            {
              ...context,
              origins: observer.origins,
            },
          );
    }
  }
  for (const observer of beforeDamage)
    if (nonCombatPlayers.has(observer.source.controller))
      collectTriggers(state, 'non-combat-damage', [observer.source], undefined, {
        origins: observer.origins,
      });
  if (attack) {
    const attacker = state.cards[attack.attacker.instanceId];
    if (attacker && isUnit(state, attacker) && attacker.incarnation === attack.attacker.incarnation)
      attack.ending = {
        source: structuredClone(attacker),
        abilities: abilityOrigins(state, attacker),
        observers: attack.ending?.observers ?? [],
      };
  }
  const observers = abilitySources(state);
  for (const assignment of frame.assignments) {
    const target = instance(state, assignment.target.instanceId);
    if (
      assignment.indirect &&
      assignment.amount &&
      target.incarnation === assignment.target.incarnation &&
      isUnit(state, target)
    )
      collectTriggers(state, 'indirect-unit-damaged', observers, target);
  }
  return {
    baseDamage: baseEvents.reduce((n, e) => n + e.amount, 0),
    sacrificed,
    damaged: damaged.map(reference),
    unitDamage,
    observers: observers.map(source => ({
      source: structuredClone(source),
      origins: abilityOrigins(state, source),
    })),
  };
}
