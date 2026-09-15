import { cardDefinition } from '../cards/catalog.ts';
import { giveTokens, isUnit } from './attachments.ts';
import { createCredits } from './credits.ts';
import { abilitiesFrom, effectiveAbilities } from './effective-abilities.ts';
import { forceToken, gainForce } from './force.ts';
import { modifyUnit } from './lasting.ts';
import type { CardInstance, GameState, TokenCreationFrame } from './model.ts';
import { recordTokenCreation, recordUnitEntry } from './phase-history.ts';
import { addCard, fact, move, reference } from './state.ts';
import { abilitySources, collectTriggers, effectFrames } from './triggers.ts';
import type { DamageFrame } from './damage.ts';

function sameReference(
  a: TokenCreationFrame['source'] | import('./model.ts').CardReference,
  b: import('./model.ts').CardReference,
) {
  return (
    a.instanceId === b.instanceId &&
    a.incarnation === b.incarnation &&
    a.cardId === b.cardId &&
    a.visibility === b.visibility
  );
}

export function assertCompoundDamage(state: GameState, frame: DamageFrame) {
  const tokens = frame.tokens;
  if (!tokens) return;
  const damage = tokens.simultaneousDamage,
    assignment = frame.assignments[0];
  if (
    !damage ||
    frame.assignments.length !== 1 ||
    !assignment ||
    !sameReference(assignment.target, damage.target) ||
    (assignment.originalAmount ?? assignment.amount) !== damage.amount ||
    frame.actor !== tokens.playerId ||
    !assignment.source ||
    JSON.stringify(assignment.source) !== JSON.stringify(tokens.source) ||
    frame.combatAttackId ||
    frame.after ||
    assignment.excess ||
    assignment.indirect ||
    tokenReplacementSources(state, tokens).length
  )
    throw new Error('Invalid compound damage');
}

function liveTarget(
  state: GameState,
  target: TokenCreationFrame['source'] | import('./model.ts').CardReference,
) {
  const card = state.cards[target.instanceId];
  return card && card.incarnation === target.incarnation && isUnit(state, card) ? card : undefined;
}
export function pendingTokenCount(state: GameState, frame: TokenCreationFrame) {
  const plan = frame.creation;
  if (plan.kind === 'upgrade')
    return plan.targets.reduce(
      (n, entry) => n + (liveTarget(state, entry.target) ? entry.count : 0),
      0,
    );
  if (plan.kind === 'force' && forceToken(state, plan.recipient)) return 0;
  return plan.count;
}
export function tokenReplacementSources(state: GameState, frame: TokenCreationFrame) {
  if (frame.declined || !pendingTokenCount(state, frame)) return [];
  return [...state.ground, ...state.space]
    .map(id => state.cards[id]!)
    .filter(
      card =>
        isUnit(state, card) &&
        card.controller === frame.creator &&
        effectiveAbilities(state, card).doubleTokensBySelfDefeat &&
        !frame.replacements.some(
          ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
        ),
    );
}
export function doubleTokenCreation(frame: TokenCreationFrame, source: CardInstance) {
  const doubled = (n: number) => {
    if (!Number.isSafeInteger(n * 2)) throw new Error('Token count overflow');
    return n * 2;
  };
  if (frame.creation.kind === 'upgrade')
    for (const target of frame.creation.targets) target.count = doubled(target.count);
  else frame.creation.count = doubled(frame.creation.count);
  frame.replacements.push(reference(source));
}
export function commitTokenCreation(
  state: GameState,
  frame: TokenCreationFrame,
  deferUpgradeTriggers = false,
) {
  const upgraded: CardInstance[] = [];
  const plan = frame.creation,
    created: CardInstance[] = [];
  let amount = 0;
  if (plan.kind === 'unit') {
    const definition = cardDefinition(state, plan.cardId);
    if (definition.kind !== 'unit' || !definition.token) throw new Error('Invalid unit token');
    for (let n = 0; n < plan.count; n++) {
      const token = addCard(state, frame.creator, plan.cardId, 'set-aside');
      move(state, token, definition.arena);
      token.exhausted = true;
      created.push(token);
    }
    if (plan.phaseAbilities)
      for (const token of created)
        modifyUnit(state, frame.source, token, {
          kind: 'modify',
          power: 0,
          hp: 0,
          abilities: plan.phaseAbilities,
          duration: 'phase',
        });
    for (const token of created) {
      recordTokenCreation(state, frame.creator);
      recordUnitEntry(state, token);
      fact(state, 'created', frame.creator, [frame.source, token]);
      collectTriggers(state, 'created', [token]);
      collectTriggers(
        state,
        'friendly-created',
        abilitySources(state).filter(c => c.controller === frame.creator),
        token,
      );
    }
    amount = created.length;
  } else if (plan.kind === 'upgrade') {
    for (const entry of plan.targets) {
      const unit = liveTarget(state, entry.target);
      if (!unit) continue;
      giveTokens(state, unit, plan.token, entry.count, frame.creator, !deferUpgradeTriggers);
      if (entry.count) upgraded.push(unit);
      amount += entry.count;
    }
  } else if (plan.kind === 'credits') {
    amount = createCredits(state, plan.recipient, plan.count, frame.source).length;
  } else if (plan.count && !forceToken(state, plan.recipient)) {
    gainForce(state, plan.recipient, frame.source);
    amount = 1;
  }
  if (frame.after) {
    const bindings = { ...frame.bindings };
    if (frame.bind) {
      delete bindings[frame.bind];
      if (created[0]) bindings[frame.bind] = reference(created[0]);
    }
    state.execution.frames.unshift(
      ...effectFrames(frame.playerId, frame.source, frame.after, {
        ...frame,
        bindings,
        groups: {
          ...frame.groups,
          ...(frame.group ? { [frame.group]: created.map(reference) } : {}),
        },
        values: { ...frame.values, ...(frame.countAs ? { [frame.countAs]: amount } : {}) },
      }),
    );
  }
  return upgraded;
}
export function assertTokenCreation(state: GameState, frame: TokenCreationFrame) {
  if (!state.seats.includes(frame.creator)) throw new Error('Invalid token creator');
  const plan = frame.creation;
  if (
    frame.simultaneousDamage &&
    (plan.kind !== 'upgrade' ||
      plan.token !== 'experience' ||
      plan.targets.length !== 1 ||
      !sameReference(plan.targets[0]!.target, frame.simultaneousDamage.target) ||
      frame.creator !== frame.playerId ||
      frame.after ||
      frame.bind ||
      frame.countAs ||
      frame.group)
  )
    throw new Error('Invalid simultaneous token damage');
  if (plan.kind === 'unit') {
    const definition = cardDefinition(state, plan.cardId);
    if (definition.kind !== 'unit' || !definition.token) throw new Error('Invalid unit token');
  } else if (plan.kind === 'credits' || plan.kind === 'force') {
    if (!state.seats.includes(plan.recipient) || plan.recipient !== frame.creator)
      throw new Error('Invalid token recipient');
  }
  for (const ref of frame.replacements) {
    const departure = state.departedUnits.find(
      d => d.reference.instanceId === ref.instanceId && d.reference.incarnation === ref.incarnation,
    );
    if (
      !departure ||
      departure.controller !== frame.creator ||
      !abilitiesFrom(state, departure.abilities).doubleTokensBySelfDefeat ||
      !state.phaseHistory.defeated.some(
        c => c.instanceId === ref.instanceId && c.incarnation === ref.incarnation,
      )
    )
      throw new Error('Invalid token replacement sacrifice');
  }
  const refs = [
    ...frame.replacements,
    ...(plan.kind === 'upgrade' ? plan.targets.map(t => t.target) : []),
  ];
  for (const ref of refs) {
    const card = state.cards[ref.instanceId];
    if (
      !card ||
      card.cardId !== ref.cardId ||
      card.incarnation < ref.incarnation ||
      card.visibility < ref.visibility
    )
      throw new Error('Invalid token creation reference');
  }
  if (
    plan.kind === 'upgrade' &&
    new Set(plan.targets.map(t => `${t.target.instanceId}/${t.target.incarnation}`)).size !==
      plan.targets.length
  )
    throw new Error('Repeated token target');
  if (
    new Set(frame.replacements.map(t => `${t.instanceId}/${t.incarnation}`)).size !==
    frame.replacements.length
  )
    throw new Error('Repeated token replacement');
}
export function planTokenCreation(
  context: import('./bindings.ts').EffectContext & { playerId: string },
  creation: TokenCreationFrame['creation'],
  next: Pick<TokenCreationFrame, 'after' | 'bind' | 'countAs' | 'group'> & {
    creator?: string;
  } = {},
): TokenCreationFrame {
  return {
    kind: 'create-tokens',
    playerId: context.playerId,
    source: structuredClone(context.source),
    creator: next.creator ?? context.playerId,
    creation: structuredClone(creation),
    replacements: [],
    ...(context.origin ? { origin: structuredClone(context.origin) } : {}),
    ...(context.bindings ? { bindings: structuredClone(context.bindings) } : {}),
    ...(context.groups ? { groups: structuredClone(context.groups) } : {}),
    ...(context.values ? { values: structuredClone(context.values) } : {}),
    ...(context.names ? { names: structuredClone(context.names) } : {}),
    ...(next.group ? { group: next.group } : {}),
    ...(next.after ? { after: structuredClone(next.after) } : {}),
    ...(next.bind ? { bind: next.bind } : {}),
    ...(next.countAs ? { countAs: next.countAs } : {}),
  };
}
