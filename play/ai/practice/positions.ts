import assert from 'node:assert/strict';
import rosterData from '../full-game/eight-decks.json';
import { decodeTrainingRoster } from '../full-game/training-roster.ts';
import { cardDefinition } from '../../cards/registry.ts';
import type { ScenarioInput } from '../../testing/scenario.ts';
import { type Exercise, type Line, type Step, pass, step } from './runner.ts';

export const practiceRoster = decodeTrainingRoster(rosterData);
export type Placement = NonNullable<ScenarioInput['players'][0]['hand']>[number];
export const c = (card: string, ref: string, properties: Partial<Placement> = {}): Placement => ({
  card,
  ref,
  ...properties,
});
export type Position = {
  resources: number;
  ready?: number;
  credits?: number;
  hp?: number;
  round?: number;
  hand?: Placement[];
  ground?: Placement[];
  space?: Placement[];
  top?: Placement[];
  discard?: Placement[];
  plot?: Placement[];
  enemyGround?: Placement[];
  enemySpace?: Placement[];
  enemyHand?: Placement[];
  enemyDiscard?: Placement[];
  enemyResources?: number;
  enemyHp?: number;
  deployed?: 'unit' | 'upgrade';
  host?: string;
  leaderDamage?: number;
  leaderExhausted?: boolean;
  opponent?: string;
  initiative?: 'p1' | 'p2';
  attacked?: string[];
  attachments?: ScenarioInput['attachments'];
};

/** Partition exact admitted mainboards; attachments which are cards also consume copies. */
export function position(deck: string, id: string, p: Position): ScenarioInput {
  const players = [0, 1].map(seat => {
    const roster = practiceRoster.decks.find(
      d => d.key === (seat ? (p.opponent ?? 'vader') : deck),
    );
    assert(roster, `Unknown practice deck ${deck}`);
    const pool = roster.snapshot.mainboard.flatMap(c => Array<string>(c.quantity).fill(c.cardId));
    const take = (entries: Placement[]) =>
      entries.map(entry => {
        const index = pool.indexOf(entry.card);
        assert(
          index >= 0,
          `${deck}/${id}: ${seat ? 'opponent' : 'learner'} list lacks ${entry.card}`,
        );
        pool.splice(index, 1);
        return entry;
      });
    const hand = take(seat ? (p.enemyHand ?? []) : (p.hand ?? []));
    const ground = take(seat ? (p.enemyGround ?? []) : (p.ground ?? []));
    const space = take(seat ? (p.enemySpace ?? []) : (p.space ?? []));
    const discard = take(seat ? (p.enemyDiscard ?? []) : (p.discard ?? []));
    const top = take(seat ? [] : (p.top ?? []));
    const plot = take(seat ? [] : (p.plot ?? []));
    for (const a of p.attachments ?? []) {
      if ((a.owner ?? 'p1') !== (seat ? 'p2' : 'p1')) continue;
      if (!['shield', 'experience', 'advantage'].includes(a.card)) take([{ card: a.card }]);
    }
    const count = seat ? (p.enemyResources ?? p.resources) : p.resources;
    assert(plot.length <= count);
    const resources = [
      ...plot,
      ...Array.from({ length: count - plot.length }, () => {
        // Named Plot resources are deliberate; filler must not introduce an
        // unrelated deployment trigger into a reference line.
        const index = pool.findLastIndex(id => {
          const definition = cardDefinition(id);
          return !('keywords' in definition && definition.keywords?.includes('Plot'));
        });
        assert(index >= 0);
        const [card] = pool.splice(index, 1);
        assert(card);
        return { card } as Placement;
      }),
    ].map((card, i) => ({
      ...card,
      ref: card.ref ?? `${seat ? 'enemy-' : ''}resource${i + 1}`,
      exhausted: !seat && i >= (p.ready ?? count),
    }));
    const base = cardDefinition(roster.snapshot.base);
    assert(base.kind === 'base');
    return {
      id: seat ? 'p2' : 'p1',
      base: {
        card: roster.snapshot.base,
        ref: seat ? 'enemy-base' : 'base',
        damage: base.hp - (seat ? (p.enemyHp ?? base.hp) : (p.hp ?? base.hp)),
      },
      leader: {
        card: roster.snapshot.leader,
        ref: seat ? 'enemy-leader' : 'leader',
        ...(!seat
          ? {
              deployedAs: p.deployed,
              attachedTo: p.host,
              damage: p.leaderDamage,
              exhausted: p.leaderExhausted,
              abilityUses: p.deployed ? { deploy: 1 } : undefined,
            }
          : {}),
      },
      credits: seat ? [] : Array.from({ length: p.credits ?? 0 }, (_, i) => `credit${i + 1}`),
      hand,
      ground,
      space,
      discard,
      resources,
      deck: [...top, ...pool.map(card => ({ card }))],
    };
  }) as ScenarioInput['players'];
  return {
    gameId: `${deck}-practice-${id}`,
    players,
    round: p.round ?? 3,
    activePlayer: 'p1',
    initiative: { holder: p.initiative ?? 'p1' },
    attachments: p.attachments,
    attackedThisPhase: p.attacked,
  };
}
export const wait: Step = { ...pass(), actor: 'p2', teach: false };
export const mode = (mode: string): Step => ({
  ...step('choose-mode'),
  intent: { kind: 'choose-mode', mode },
  label: mode,
});
export const decline = (): Step => step('decline-effect');
export const select = (...selections: string[]): Step => ({ ...step('accept-effect'), selections });
export const search = (...selections: string[]): Step => ({ ...step('search'), selections });
export function exercise(
  deck: string,
  id: string,
  title: string,
  reason: string,
  p: Position,
  steps: Line['steps'],
  check: Line['check'],
  assumptions = '',
): Exercise {
  return {
    id: `${deck}-${id}`,
    title,
    skill: title,
    question: reason,
    assumptions: `${assumptions} Exact saved mainboards; staged visible position. The opponent passes only where stated in the reference. This teaches decisions on a reference sequence, not autonomous completion.`,
    opponent: p.opponent ?? 'vader',
    input: position(deck, id, p),
    lines: [{ label: 'Reference line', reason, steps, check }],
  };
}
export const zone =
  (alias: string, zone: string): Line['check'] =>
  r =>
    assert.equal(r.card(alias).zone, zone);
export const dead = (alias: string): Line['check'] => zone(alias, 'discard');
export const won: Line['check'] = r => assert.equal(r.state.result?.winner, 'p1');
export const exhausted =
  (alias: string): Line['check'] =>
  r =>
    assert.equal(r.card(alias).exhausted, true);
