import { reconcilePrintedStats } from '../engine/printed-stats.ts';
import { cardTraits, unitIsLeader } from '../engine/attributes.ts';
import { createCredits } from '../engine/credits.ts';
import { gainForce } from '../engine/force.ts';
import { z } from 'zod';
import { scheduleRegroup } from '../engine/delayed.ts';
import { upgradeProfile } from '../engine/roles.ts';
import { attach, isUnit } from '../engine/attachments.ts';
import { unitProfile } from '../engine/abilities.ts';
import { cardDefinition } from '../cards/registry.ts';
import { settle } from '../engine/advance.ts';
import { cardIdSchema, idSchema } from '../engine/model.ts';
import type { GameState } from '../engine/model.ts';
import { addCard, addPlayer, assertState, emptyState, instance, move } from '../engine/state.ts';

const placement = z.strictObject({
  card: cardIdSchema,
  ref: idSchema.optional(),
  movedArena: z.boolean().default(false),
  controller: idSchema.optional(),
  damage: z.number().int().nonnegative().default(0),
  exhausted: z.boolean().default(false),
});
const leader = z.strictObject({
  ref: idSchema.optional(),
  card: cardIdSchema,
  deployedAs: z.enum(['unit', 'upgrade']).nullable().default(null),
  leaderSide: z.literal('back').optional(),
  attachedTo: idSchema.optional(),
  exhausted: z.boolean().default(false),
  damage: z.number().int().nonnegative().default(0),
  abilityUses: z.record(idSchema, z.number().int().nonnegative()).default({}),
});
const player = z.strictObject({
  credits: z.array(idSchema).max(1000).default([]),
  force: z.boolean().default(false),
  id: idSchema,
  base: z.strictObject({
    ref: idSchema.optional(),
    card: cardIdSchema,
    damage: z.number().int().nonnegative().default(0),
  }),
  leader,
  deck: z.array(placement).max(120).default([]),
  hand: z.array(placement).max(120).default([]),
  resources: z.array(placement).max(120).default([]),
  discard: z.array(placement).max(120).default([]),
  ground: z.array(placement).max(120).default([]),
  space: z.array(placement).max(120).default([]),
});
const scenarioSchema = z.strictObject({
  gameId: idSchema,
  players: z.tuple([player, player]),
  captured: z
    .array(
      z.strictObject({
        card: cardIdSchema,
        owner: idSchema,
        guard: idSchema,
        ref: idSchema.optional(),
      }),
    )
    .max(240)
    .default([]),
  delayed: z
    .array(
      z.strictObject({
        source: idSchema,
        unit: idSchema,
        round: z.number().int().positive().optional(),
      }),
    )
    .max(1000)
    .default([]),
  defeatedThisPhase: z.array(idSchema).max(120).default([]),
  dealtBaseDamageThisPhase: z.array(idSchema).max(120).default([]),
  attackedThisPhase: z.array(idSchema).max(120).default([]),
  enteredThisPhase: z.array(idSchema).max(240).default([]),
  attachments: z
    .array(
      z.strictObject({
        card: cardIdSchema,
        ref: idSchema.optional(),
        unit: idSchema,
        owner: idSchema.optional(),
      }),
    )
    .max(1000)
    .default([]),
  activePlayer: idSchema,
  initiative: z.strictObject({ holder: idSchema, claimed: z.boolean().default(false) }),
  round: z.number().int().min(1).default(1),
  consecutivePasses: z.number().int().min(0).max(1).default(0),
  lastPassPlayer: idSchema.nullable().optional(),
  extraActions: z.number().int().min(0).max(100).default(0),
});
export type ScenarioInput = z.input<typeof scenarioSchema>;

// A fixture starts at a settled action-phase position, with
// explicit phase history and Epic Action usage supplied when relevant.
// This is a server/test constructor, never a command that replaces a live game.
export function scenario(input: ScenarioInput): { state: GameState; refs: Record<string, string> } {
  const config = scenarioSchema.parse(input);
  const state = emptyState(config.gameId, [config.players[0].id, config.players[1].id]);
  const refs: Record<string, string> = {};
  const alias = (ref: string | undefined, id: string) => {
    if (!ref) return;
    if (Object.hasOwn(refs, ref)) throw new Error('Duplicate scenario reference');
    refs[ref] = id;
  };
  state.phase = 'action';
  state.round = config.round;
  state.activePlayer = config.activePlayer;
  state.initiative = { ...config.initiative };
  state.consecutivePasses = config.consecutivePasses;
  state.lastPassPlayer =
    config.lastPassPlayer ??
    (config.consecutivePasses ? state.seats.find(id => id !== config.activePlayer)! : null);
  for (const player of config.players) {
    addPlayer(state, player.id, player.base.card, player.leader.card);
    instance(state, state.players[player.id]!.base).damage = player.base.damage;
    alias(player.base.ref, state.players[player.id]!.base);
    if (player.force) gainForce(state, player.id);
    for (const ref of player.credits) alias(ref, createCredits(state, player.id, 1)[0]!.instanceId);
    const card = instance(state, state.players[player.id]!.leader),
      definition = cardDefinition(card.cardId);
    if (definition.kind !== 'leader') throw new Error('Invalid scenario leader');
    alias(player.leader.ref, card.instanceId);
    card.abilityUses = { ...player.leader.abilityUses };
    if (player.leader.leaderSide) card.leaderSide = player.leader.leaderSide;
    if ((player.leader.deployedAs === 'upgrade') !== !!player.leader.attachedTo)
      throw new Error('Pilot leader requires an attachment alias');
    card.deployedAs = player.leader.deployedAs === 'unit' ? 'unit' : null;
    if (card.deployedAs) move(state, card, unitProfile(definition).arena);
    card.exhausted = player.leader.exhausted;
    card.damage = player.leader.damage;
    for (const zone of ['deck', 'hand', 'resources', 'discard', 'ground', 'space'] as const) {
      for (const entry of player[zone]) {
        const definition = cardDefinition(entry.card);
        if (
          definition.kind !== 'unit' &&
          !(
            (definition.kind === 'event' || (definition.kind === 'upgrade' && !definition.token)) &&
            zone !== 'ground' &&
            zone !== 'space'
          )
        )
          throw new Error('Unsupported scenario card role');
        if (
          (zone === 'ground' || zone === 'space') &&
          definition.kind === 'unit' &&
          definition.arena !== zone &&
          !entry.movedArena
        )
          throw new Error(
            'Scenario arena differs from printed arena; set movedArena for an existing moved unit',
          );
        const card = addCard(state, player.id, entry.card, zone);
        if (entry.controller) {
          if (!isUnit(state, card) || !state.seats.includes(entry.controller))
            throw new Error('Invalid scenario controller');
          card.controller = entry.controller;
        }
        card.damage = entry.damage;
        card.exhausted = entry.exhausted;
        alias(entry.ref, card.instanceId);
      }
    }
  }
  for (const player of config.players) {
    if (player.leader.deployedAs !== 'upgrade') continue;
    const card = instance(state, state.players[player.id]!.leader);
    const host = refs[player.leader.attachedTo!] && state.cards[refs[player.leader.attachedTo!]!];
    if (!host || player.leader.exhausted)
      throw new Error('Invalid pilot leader host or exhaustion');
    card.deployedAs = 'upgrade';
    attach(state, card, host, false);
  }
  for (const entry of config.attachments) {
    if (!refs[entry.unit]) throw new Error('Unknown attachment alias');
    const unit = instance(state, refs[entry.unit]!);
    const definition = cardDefinition(entry.card);
    if (definition.kind === 'leader' || !upgradeProfile(definition))
      throw new Error('Unsupported scenario attachment');
    const owner = entry.owner ?? unit.controller;
    if (!state.seats.includes(owner)) throw new Error('Invalid attachment owner');
    const card = addCard(
      state,
      owner,
      entry.card,
      definition.kind === 'upgrade' && definition.token ? 'set-aside' : 'hand',
    );
    attach(state, card, unit, false);
    alias(entry.ref, card.instanceId);
  }
  for (const entry of config.captured) {
    const guard = refs[entry.guard] && state.cards[refs[entry.guard]!];
    const definition = cardDefinition(entry.card);
    if (
      !guard ||
      !(isUnit(state, guard) || cardDefinition(guard.cardId).kind === 'base') ||
      !state.seats.includes(entry.owner) ||
      definition.kind !== 'unit' ||
      definition.token
    )
      throw new Error('Invalid scenario captivity');
    const unit = addCard(state, entry.owner, entry.card, 'captured');
    unit.capturedBy = { instanceId: guard.instanceId, incarnation: guard.incarnation };
    alias(entry.ref, unit.instanceId);
  }
  for (const entry of config.delayed) {
    if (!refs[entry.source] || !refs[entry.unit]) throw new Error('Unknown delayed reference');
    const source = instance(state, refs[entry.source]!),
      unit = instance(state, refs[entry.unit]!);
    scheduleRegroup(
      state,
      source.controller,
      source,
      unit,
      'defeat-at-regroup',
      entry.round ?? state.round,
    );
  }
  for (const alias of config.defeatedThisPhase) {
    const card = refs[alias] && state.cards[refs[alias]!];
    if (!card || !(card.zone === 'discard' || card.zone === 'base'))
      throw new Error('Invalid historical defeat alias');
    const definition = cardDefinition(card.cardId);
    if (definition.kind !== 'unit' && definition.kind !== 'leader')
      throw new Error('Historical defeat requires a unit');
    state.phaseHistory.defeated.push({
      leaderUnit: definition.kind === 'leader',
      ...structuredClone(card),
      traits: [...cardTraits(state, card)],
      zone: unitProfile(definition).arena,
      deployedAs: definition.kind === 'leader' ? 'unit' : null,
    });
  }
  for (const name of config.dealtBaseDamageThisPhase) {
    const id = refs[name];
    const card = id && state.cards[id];
    if (!card || !isUnit(state, card)) throw new Error('Historical base damage requires a unit');
    state.phaseHistory.baseDamageSources.push({
      instanceId: card.instanceId,
      cardId: card.cardId,
      incarnation: card.incarnation,
      visibility: card.visibility,
    });
  }
  for (const alias of config.attackedThisPhase) {
    const card = refs[alias] && state.cards[refs[alias]!];
    if (!card || !isUnit(state, card))
      throw new Error('Historical attack requires an in-play unit');
    state.phaseHistory.attacks.push({
      leaderUnit: unitIsLeader(state, card),
      ...structuredClone(card),
      traits: [...cardTraits(state, card)],
    });
  }
  state.facts = [];
  reconcilePrintedStats(state);
  assertState(state);
  state.execution.frames = [
    { kind: 'action', ...(config.extraActions ? { extraActions: config.extraActions } : {}) },
  ];
  for (const name of config.enteredThisPhase) {
    const id = refs[name];
    if (!id) throw new Error('Unknown entry alias');
    const card = instance(state, id);
    state.phaseHistory.entered.push({
      instanceId: id,
      cardId: card.cardId,
      incarnation: card.incarnation,
      visibility: card.visibility,
    });
  }
  for (const ref of state.phaseHistory.entered) {
    const card = state.cards[ref.instanceId]!;
    if (isUnit(state, card))
      state.phaseHistory.unitEntries.push({
        leaderUnit: unitIsLeader(state, card),
        ...structuredClone(card),
        traits: [...cardTraits(state, card)],
      });
  }
  state.phaseHistory.tokensCreated = [];
  settle(state);
  assertState(state);
  return { state, refs };
}
