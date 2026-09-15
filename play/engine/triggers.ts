import type { CatalogContext } from '../cards/catalog.ts';
import { takePhaseTriggers } from './phase-triggers.ts';
import { repeatedBounty } from './bounty.ts';
import { upgradeProfile } from './roles.ts';
import { conditionMatches } from './conditions.ts';
import type { EffectContext } from './bindings.ts';
import { isUnit } from './attachments.ts';
import { activeAbilities } from './abilities.ts';
import { abilitiesFrom, abilityOrigins, originAbilities } from './effective-abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { Abilities, CardEffect, TriggerDefinition } from '../cards/definition.ts';
import type { AbilityOrigin, CardInstance, Frame, GameState, Trigger } from './model.ts';
import { allocateId, fact, instance, reference, opponent } from './state.ts';

export function triggerDefinitions(
  state: CatalogContext,
  card: CardInstance,
  origins?: readonly AbilityOrigin[],
): readonly TriggerDefinition[] {
  const abilities = origins ? abilitiesFrom(state, origins) : activeAbilities(state, card);
  const plot: TriggerDefinition[] =
    card.zone === 'resources' && abilities.keywords?.includes('Plot')
      ? [{ id: 'plot', timing: 'leader-deployed', effects: [{ kind: 'plot-play' }] }]
      : [];
  const shielded: TriggerDefinition[] = abilities.keywords?.includes('Shielded')
    ? (['played', 'deployed', 'created'] as const).map(timing => ({
        id: `shielded-${timing}`,
        timing,
        effects: [{ kind: 'give-self-token', token: 'shield' }],
      }))
    : [];
  const support: TriggerDefinition[] = abilities.keywords?.includes('Support')
    ? (['played', 'deployed', 'created'] as const).map(timing => ({
        id: `support-${timing}`,
        timing,
        effects: [{ kind: 'support' }],
      }))
    : [];
  const restore: TriggerDefinition[] = abilities.restore
    ? [
        {
          id: 'restore-attack',
          timing: 'attack',
          effects: [{ kind: 'heal-own-base', amount: abilities.restore }],
        },
      ]
    : [];
  const saboteur: TriggerDefinition[] = abilities.keywords?.includes('Saboteur')
    ? [{ id: 'saboteur-attack', timing: 'attack', effects: [{ kind: 'defeat-defender-shields' }] }]
    : [];
  const ambush: TriggerDefinition[] = abilities.keywords?.includes('Ambush')
    ? (['played', 'deployed', 'created'] as const).map(timing => ({
        id: 'ambush',
        timing,
        effects: [{ kind: 'ambush' }],
      }))
    : [];
  const bounties: TriggerDefinition[] = (abilities.bounties ?? []).map(b => ({
    id: `${b.id}-bounty`,
    timing: 'bounty',
    optional: true,
    effects: b.effects,
  }));
  return [
    ...bounties,
    ...plot,
    ...ambush,
    ...(abilities.triggers ?? []),
    ...shielded,
    ...support,
    ...restore,
    ...saboteur,
  ];
}

// Capture the source before simultaneous removals. Resolution belongs to this
// controller even if the physical card has since moved (v8 §§7.6.3–4, 7.6.14).
export function triggerObservers(
  state: GameState,
  timing: TriggerDefinition['timing'],
  playerId: string,
) {
  return abilitySources(state)
    .filter(c => c.controller === playerId)
    .flatMap(source => {
      const origins = abilityOrigins(state, source);
      return triggerDefinitions(state, source, origins).some(a => a.timing === timing)
        ? [{ source: structuredClone(source), origins: structuredClone(origins) }]
        : [];
    });
}
// These observer timings have no generated keyword triggers. Find possible
// printed, borrowed or granted sources before resolving continuous abilities.
// Conditions and ability loss are deliberately left to abilityOrigins.
export function declaredTriggerObservers(
  state: GameState,
  timing: 'unit-left-play' | 'enemy-base-damage' | 'attack-ability-used',
) {
  const candidates = new Set<string>();
  let aura = false;
  const consider = (id: string, abilities: Abilities | undefined) => {
    if (abilities?.triggers?.some(t => t.timing === timing)) candidates.add(id);
    aura ||= !!abilities?.auras?.some(a => a.abilities?.triggers?.some(t => t.timing === timing));
  };
  const sources = abilitySources(state);
  for (const source of sources) {
    consider(source.instanceId, activeAbilities(state, source));
    if (source.attachedTo) {
      const profile = upgradeProfile(cardDefinition(state, source.cardId));
      consider(source.attachedTo.instanceId, profile?.grants);
      consider(source.attachedTo.instanceId, { triggers: profile?.attackOverride });
    }
  }
  for (const attack of state.attacks)
    for (const origin of attack.grantedAbilities)
      consider(attack.attacker.instanceId, originAbilities(state, origin));
  for (const effect of state.lastingEffects) consider(effect.target.instanceId, effect.abilities);
  return sources
    .filter(source => candidates.has(source.instanceId) || (aura && isUnit(state, source)))
    .flatMap(source => {
      const origins = abilityOrigins(state, source);
      return triggerDefinitions(state, source, origins).some(t => t.timing === timing)
        ? [{ source: structuredClone(source), origins: structuredClone(origins) }]
        : [];
    });
}
export function captureTriggers(
  state: GameState,
  timing: TriggerDefinition['timing'],
  sources: readonly CardInstance[],
  subject?: CardInstance,
  context?: Pick<EffectContext, 'bindings' | 'groups' | 'values' | 'names'> & {
    origins?: readonly AbilityOrigin[];
    silent?: boolean;
  },
) {
  const collected: Trigger[] = [];
  for (const source of sources) {
    const origins = context?.origins ?? abilityOrigins(state, source);
    for (const ability of triggerDefinitions(state, source, origins)) {
      if (ability.timing !== timing) continue;
      if (
        ability.condition &&
        !conditionMatches(state, source.controller, ability.condition, {
          source,
          ...context,
          bindings: { ...context?.bindings, ...(subject ? { subject: reference(subject) } : {}) },
        })
      )
        continue;
      if (
        ability.excludeSelf &&
        (!subject ||
          (source.instanceId === subject.instanceId && source.incarnation === subject.incarnation))
      )
        continue;
      const trigger: Trigger = {
        id: allocateId(state, 't'),
        playerId: timing === 'bounty' ? opponent(state, source.controller) : source.controller,
        source: structuredClone(source),
        ...(subject ? { subject: structuredClone(subject) } : {}),
        ...(context?.bindings ? { bindings: structuredClone(context.bindings) } : {}),
        ...(context?.groups ? { groups: structuredClone(context.groups) } : {}),
        ...(context?.values ? { values: structuredClone(context.values) } : {}),
        ...(context?.names ? { names: structuredClone(context.names) } : {}),
        abilityId: ability.id,
        abilities: structuredClone([...origins]),
      };
      if (!triggerAvailable(state, trigger)) continue;
      collected.push(trigger);
      if (!context?.silent) fact(state, 'triggered', trigger.playerId, [trigger.source]);
    }
  }
  return collected;
}

export function collectTriggers(...args: Parameters<typeof captureTriggers>) {
  args[0].execution.pendingTriggers.push(...captureTriggers(...args));
}

export function effectFrames(
  playerId: string,
  source: CardInstance,
  effects: readonly CardEffect[],
  context?: Pick<EffectContext, 'bindings' | 'groups' | 'values' | 'names' | 'origin'>,
): Extract<Frame, { kind: 'effect' }>[] {
  return effects.map(effect => ({
    kind: 'effect',
    playerId,
    source: structuredClone(source),
    effect: structuredClone(effect),
    ...(context?.origin ? { origin: structuredClone(context.origin) } : {}),
    ...(context?.bindings ? { bindings: structuredClone(context.bindings) } : {}),
    ...(context?.groups ? { groups: structuredClone(context.groups) } : {}),
    ...(context?.values ? { values: structuredClone(context.values) } : {}),
    ...(context?.names ? { names: structuredClone(context.names) } : {}),
  }));
}

export function flushTriggers(state: GameState) {
  const triggers = state.execution.pendingTriggers;
  state.execution.pendingTriggers = [];
  if (triggers.length)
    state.execution.frames.unshift({ kind: 'trigger-batch', playerId: null, triggers });
}

function triggerUseKey(trigger: Trigger, ability: TriggerDefinition) {
  return JSON.stringify([trigger.source.instanceId, trigger.source.incarnation, ability.id]);
}
export function triggerAvailable(state: GameState, trigger: Trigger) {
  const ability = triggerDefinitions(state, trigger.source, trigger.abilities).find(
    a => a.id === trigger.abilityId,
  );
  return (
    !!ability &&
    (!ability.limit || !state.roundHistory.triggerUses.includes(triggerUseKey(trigger, ability)))
  );
}
export function resolveTrigger(
  state: GameState,
  batch: Extract<Frame, { kind: 'trigger-batch' }>,
  id: string,
) {
  const trigger = batch.triggers.find(trigger => trigger.id === id);
  if (!trigger) throw new Error('Missing trigger');
  const ability = triggerDefinitions(state, trigger.source, trigger.abilities).find(
    ability => ability.id === trigger.abilityId,
  );
  if (!ability || !triggerAvailable(state, trigger))
    throw new Error('Missing or spent versioned ability');
  const remaining = batch.chooseOne ? [] : batch.triggers.filter(trigger => trigger.id !== id);
  // The selected player's entire older batch stays selected while nested
  // batches finish ahead of it. Every new layer gets its own player choice.
  if (remaining.length)
    state.execution.frames.unshift({ ...batch, triggers: remaining, playerId: trigger.playerId });
  if (ability.optional) state.execution.frames.unshift({ kind: 'optional-trigger', trigger });
  else resolveAcceptedTrigger(state, trigger);
}

export function resolveAcceptedTrigger(state: GameState, trigger: Trigger) {
  const ability = triggerDefinitions(state, trigger.source, trigger.abilities).find(
    a => a.id === trigger.abilityId,
  );
  if (!ability || !triggerAvailable(state, trigger))
    throw new Error('Unavailable optional trigger');
  if (ability.limit) state.roundHistory.triggerUses.push(triggerUseKey(trigger, ability));
  const observed: Trigger[] = [];
  let bountyIndex: number | undefined;
  if (ability.timing === 'bounty') {
    bountyIndex = state.usedBounties.length;
    state.usedBounties.push(structuredClone(trigger));
    fact(state, 'bounty-collected', trigger.playerId, [trigger.source]);
    for (const observer of triggerObservers(state, 'bounty-collected', trigger.playerId))
      observed.push(
        ...captureTriggers(state, 'bounty-collected', [observer.source], trigger.source, {
          origins: observer.origins,
          values: { 'used-bounty': bountyIndex },
        }),
      );
  }
  if (ability.timing === 'defeated') {
    const index = state.usedDefeatedAbilities.length;
    for (const observer of triggerObservers(state, 'defeated-ability-used', trigger.playerId))
      observed.push(
        ...captureTriggers(state, 'defeated-ability-used', [observer.source], trigger.source, {
          origins: observer.origins,
          values: { 'used-defeated': index },
        }),
      );
    if (observed.length) state.usedDefeatedAbilities.push(structuredClone(trigger));
  }

  if (
    explicitPlayedAbility(state, trigger) &&
    state.phaseTriggers.some(
      e => e.timing === 'played-ability-used' && e.trigger.playerId === trigger.playerId,
    )
  ) {
    const index = state.usedPlayedAbilities.length;
    state.usedPlayedAbilities.push(structuredClone(trigger));
    observed.push(
      ...takePhaseTriggers(state, trigger.playerId, 'played-ability-used', trigger.source, {
        'used-played': index,
      }),
    );
  }
  if (ability.timing === 'attack' && explicitAttackAbility(state, trigger)) {
    const index = state.usedAttackAbilities.length;
    for (const observer of declaredTriggerObservers(state, 'attack-ability-used').filter(
      o => o.source.controller === trigger.playerId,
    ))
      observed.push(
        ...captureTriggers(state, 'attack-ability-used', [observer.source], trigger.source, {
          origins: observer.origins,
          values: { 'used-attack': index },
        }),
      );
    if (observed.length) state.usedAttackAbilities.push(structuredClone(trigger));
  }
  state.execution.frames.unshift(
    ...effectFrames(trigger.playerId, trigger.source, ability.effects, {
      origin:
        trigger.abilities.find(o => o.id !== 'self' && trigger.abilityId.startsWith(o.id + '-')) ??
        trigger.abilities.find(o => o.id === 'self'),
      bindings: {
        ...trigger.bindings,
        ...(trigger.subject ? { subject: reference(trigger.subject) } : {}),
      },
      ...(trigger.groups ? { groups: trigger.groups } : {}),
      ...(trigger.values || bountyIndex !== undefined
        ? {
            values: {
              ...trigger.values,
              ...(bountyIndex !== undefined ? { 'bounty-context': bountyIndex } : {}),
            },
          }
        : {}),
      ...(trigger.names ? { names: trigger.names } : {}),
    }),
    ...(observed.length ? [{ kind: 'queue-triggers' as const, triggers: observed }] : []),
    { kind: 'flush-triggers' },
  );
}

export function sameIncarnation(state: GameState, source: CardInstance): CardInstance | null {
  const current = instance(state, source.instanceId);
  return current.incarnation === source.incarnation ? current : null;
}

export function uniqueConflict(state: GameState): { playerId: string; cards: string[] } | null {
  for (const playerId of [
    state.activePlayer,
    ...state.seats.filter(id => id !== state.activePlayer),
  ]) {
    const groups = new Map<string, string[]>();
    for (const id of [...state.ground, ...state.space]) {
      const card = instance(state, id);
      if (card.controller !== playerId || !cardDefinition(state, card.cardId).unique) continue;
      const group = groups.get(card.cardId) ?? [];
      group.push(id);
      groups.set(card.cardId, group);
    }
    for (const cards of groups.values()) if (cards.length > 1) return { playerId, cards };
  }
  return null;
}

export function abilitySources(state: GameState): CardInstance[] {
  return Object.values(state.cards).filter(
    card => card.zone === 'base' || card.zone === 'ground' || card.zone === 'space',
  );
}

export function arenaSources(state: GameState): CardInstance[] {
  return Object.values(state.cards).filter(card => isUnit(state, card));
}

// V8 §7.6.17: invoke one available When Defeated ability without a defeat event.
// Source snapshots and origins use the ordinary continuation and projection contracts.
export function defeatedAbilityChoices(state: GameState, source: CardInstance): Trigger[] {
  const origins = abilityOrigins(state, source);
  return triggerDefinitions(state, source, origins)
    .filter(ability => ability.timing === 'defeated')
    .map(ability => ({
      id: ability.id,
      playerId: source.controller,
      source: structuredClone(source),
      abilityId: ability.id,
      abilities: structuredClone(origins),
    }))
    .filter(trigger => triggerAvailable(state, trigger));
}
export function invokeDefeatedAbility(state: GameState, source: CardInstance) {
  const triggers = defeatedAbilityChoices(state, source).map(trigger => ({
    ...trigger,
    id: allocateId(state, 't'),
  }));
  if (!triggers.length) return;
  state.execution.frames.unshift({
    kind: 'trigger-batch',
    chooseOne: true,
    playerId: source.controller,
    triggers,
  });
}

export function repeatedDefeatedAbility(
  state: GameState,
  playerId: string,
  index: number | undefined,
) {
  const trigger = index === undefined ? undefined : state.usedDefeatedAbilities[index];
  if (
    !trigger ||
    trigger.playerId !== playerId ||
    !triggerDefinitions(state, trigger.source, trigger.abilities).some(
      a => a.id === trigger.abilityId && a.timing === 'defeated',
    )
  )
    throw new Error('Invalid repeated defeat ability');
  return trigger;
}
export function repeatDefeatedAbility(
  state: GameState,
  playerId: string,
  index: number | undefined,
) {
  const trigger = repeatedDefeatedAbility(state, playerId, index);
  if (!triggerAvailable(state, trigger)) return;
  state.execution.frames.unshift({
    kind: 'trigger-batch',
    playerId,
    triggers: [{ ...structuredClone(trigger), id: allocateId(state, 't') }],
  });
}

// On Attack text is distinct from keywords that share its timing window.
export function explicitAttackAbility(state: CatalogContext, trigger: Trigger): boolean {
  return !!abilitiesFrom(state, trigger.abilities).triggers?.some(
    a => a.id === trigger.abilityId && a.timing === 'attack',
  );
}
export function repeatedAttackAbility(
  state: GameState,
  playerId: string,
  index: number | undefined,
) {
  const trigger = index === undefined ? undefined : state.usedAttackAbilities[index];
  if (!trigger || trigger.playerId !== playerId || !explicitAttackAbility(state, trigger))
    throw new Error('Invalid repeated attack ability');
  return trigger;
}
export function repeatAttackAbility(state: GameState, playerId: string, index: number | undefined) {
  const trigger = repeatedAttackAbility(state, playerId, index);
  if (!triggerAvailable(state, trigger)) return;
  state.execution.frames.unshift({
    kind: 'trigger-batch',
    playerId,
    triggers: [{ ...structuredClone(trigger), id: allocateId(state, 't') }],
  });
}

export function repeatBounty(state: GameState, playerId: string, index: number | undefined) {
  resolveAcceptedTrigger(state, structuredClone(repeatedBounty(state, playerId, index)));
}

export function explicitPlayedAbility(state: CatalogContext, trigger: Trigger): boolean {
  return !!abilitiesFrom(state, trigger.abilities).triggers?.some(
    a => a.id === trigger.abilityId && a.timing === 'played',
  );
}
export function repeatedPlayedAbility(
  state: GameState,
  playerId: string,
  index: number | undefined,
) {
  const trigger = index === undefined ? undefined : state.usedPlayedAbilities[index];
  if (!trigger || trigger.playerId !== playerId || !explicitPlayedAbility(state, trigger))
    throw new Error('Invalid repeated played ability');
  return trigger;
}
export function repeatPlayedAbility(state: GameState, playerId: string, index: number | undefined) {
  const trigger = repeatedPlayedAbility(state, playerId, index);
  if (!triggerAvailable(state, trigger)) return;
  state.execution.frames.unshift({
    kind: 'trigger-batch',
    playerId,
    triggers: [{ ...structuredClone(trigger), id: allocateId(state, 't') }],
  });
}
