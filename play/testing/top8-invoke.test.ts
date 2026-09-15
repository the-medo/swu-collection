import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const chimaera = 'chimaera--reinforcing-the-center';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
function board() {
  const p = position();
  for (const player of p.players)
    player.resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].hand = [{ card: chimaera, ref: 'chimaera' }];
  p.players[0].ground = [
    { card: 'ant-droid', ref: 'droid' },
    { card: ids.marine, ref: 'vanilla' },
  ];
  p.players[1].ground = [{ card: 'ant-droid', ref: 'enemy' }];
  return p;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
test('Chimaera invokes a friendly unit’s When Defeated without moving or defeating it', () => {
  const g = scenario(board()),
    before = g.state.cards[g.refs.droid!]!,
    pending = step(g.state, 'play');
  const targets = pending.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'target' ? [o.intent.card] : [],
  );
  expect(targets).toEqual([g.refs.droid!]);
  const input = choose(pending, i => i.kind === 'target' && i.card === g.refs.droid);
  resume(pending, input);
  const s = advance(pending, input).state;
  expect(s.cards[g.refs.droid!]!).toEqual(before);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.players.alice!.deck).toHaveLength(11);
  expect(s.phaseHistory.defeated).toHaveLength(0);
  expect(s.phaseHistory.entered.map(r => r.instanceId)).toEqual([g.refs.chimaera!]);
  expect(s.facts.some(f => f.type === 'defeated')).toBe(false);
});
test('the invocation is optional and a unit without an available ability cannot be chosen', () => {
  const g = scenario(board()),
    pending = step(g.state, 'play');
  expect(step(pending, 'decline-effect').players.alice!.hand).toHaveLength(0);
  const p = board();
  p.players[0].ground = [{ card: ids.marine }];
  const h = scenario(p),
    s = step(h.state, 'play');
  expect(s.activePlayer).toBe('bob');
  expect(s.execution.decision!.kind).toBe('action');
});
test('ability loss on the candidate removes its invocation choice', () => {
  const g = scenario(board());
  modifyUnit(g.state, g.state.cards[g.refs.droid!]!, g.state.cards[g.refs.droid!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  const s = step(g.state, 'play');
  expect(s.activePlayer).toBe('bob');
  expect(s.players.alice!.hand).toHaveLength(0);
});
test('a unit with printed and granted When Defeated abilities selects exactly one, with its separate printed origin', () => {
  const p = board();
  p.attachments = [{ card: 'creditor-s-claim', unit: 'droid', ref: 'claim' }];
  const g = scenario(p),
    pending = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.droid);
  const f = pending.execution.frames[0]!;
  if (f.kind !== 'trigger-batch') throw new Error('Missing invocation');
  expect(f.chooseOne).toBe(true);
  expect(f.triggers).toHaveLength(2);
  const draw = f.triggers.find(t => t.abilityId === 'on-defeated')!,
    defeat = f.triggers.find(t => t.abilityId !== 'on-defeated')!;
  resume(
    pending,
    choose(pending, i => i.kind === 'trigger' && i.triggerId === draw.id),
  );
  const drawn = step(pending, i => i.kind === 'trigger' && i.triggerId === draw.id);
  expect(drawn.players.alice!.hand).toHaveLength(1);
  expect(drawn.cards[g.refs.enemy!]!.zone).toBe('ground');
  let killed = step(pending, i => i.kind === 'trigger' && i.triggerId === defeat.id);
  const view = new Projector(
    pending.gameId,
    { role: 'player', playerId: 'alice' },
    'v'.repeat(32),
  ).project(pending);
  expect(
    view.decision!.options.some(o => o.ability?.grantedBy?.cardId === 'creditor-s-claim'),
  ).toBe(true);
  resume(
    killed,
    choose(killed, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  killed = step(killed, i => i.kind === 'target' && i.card === g.refs.enemy);
  expect(killed.players.alice!.hand).toHaveLength(0);
  expect(killed.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(killed.players.bob!.hand).toHaveLength(1);
  expect(killed.cards[g.refs.droid!]!.zone).toBe('ground');
});
test('an invoked ability resolves a fresh ordinary target and preserves the source’s current stats', () => {
  const p = board();
  p.players[0].space = [{ card: 'raddus--holdo-s-final-command', ref: 'raddus' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.raddus!]!, g.state.cards[g.refs.raddus!]!, {
    kind: 'modify',
    power: 2,
    hp: 0,
    duration: 'phase',
  });
  const pending = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.raddus);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  const s = step(pending, i => i.kind === 'target' && i.card === g.refs.enemy);
  expect(
    s.facts.find(f => f.type === 'damage' && f.cards.some(r => r.instanceId === g.refs.enemy))
      ?.amount,
  ).toBe(10);
  expect(s.cards[g.refs.raddus!]!.zone).toBe('space');
});
test('Chimaera’s own actual defeat creates two exhausted TIE Fighter tokens with distinct identities', () => {
  const p = board();
  p.players[0].ground = [];
  p.players[1].hand = [{ card: 'direct-hit' }];
  const g = scenario(p),
    s = step(
      step(step(g.state, 'play'), 'play'),
      i => i.kind === 'target' && i.card === g.refs.chimaera,
    );
  const fighters = s.space.map(id => s.cards[id]!).filter(c => c.cardId === 'tie-fighter');
  expect(fighters).toHaveLength(2);
  expect(new Set(fighters.map(c => c.instanceId)).size).toBe(2);
  expect(fighters.every(c => c.controller === 'alice' && c.exhausted)).toBe(true);
  expect(s.cards[g.refs.chimaera!]!.zone).toBe('discard');
});
test('another unit’s condition referring to combat defeat is not invented by an invocation', () => {
  const p = board();
  p.players[0].ground = [{ card: 'paz-vizsla--for-a-brighter-future', ref: 'paz' }];
  const g = scenario(p),
    s = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.paz);
  expect(s.ground.filter(id => s.cards[id]!.cardId === 'mandalorian')).toHaveLength(2);
  expect(s.cards[g.refs.paz!]!.zone).toBe('ground');
  expect(s.phaseHistory.defeated).toHaveLength(0);
});
test('checkpoints reject selecting an unrelated trigger as the one invoked defeat ability', () => {
  const p = board();
  p.attachments = [{ card: 'creditor-s-claim', unit: 'droid' }];
  const g = scenario(p),
    s = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.droid);
  const f = s.execution.frames[0]!;
  if (f.kind !== 'trigger-batch') throw new Error('Missing invocation');
  f.playerId = null;
  expect(() => decodeState(encodeState(s))).toThrow('Invalid invoked ability selection');
});

test('the official resource wording moves a live Technician to its controller’s resources, clearing damage and attachments without a defeat', () => {
  const p = board();
  p.players[0].ground = [
    { card: 'superlaser-technician', ref: 'technician', exhausted: true, damage: 1 },
  ];
  p.attachments = [{ card: 'creditor-s-claim', unit: 'technician', ref: 'claim' }];
  const g = scenario(p);
  let s = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.technician);
  const f = s.execution.frames[0]!;
  if (f.kind !== 'trigger-batch') throw new Error('Missing invocation');
  const resource = f.triggers.find(t => t.abilityId === 'when-defeated')!;
  s = step(s, i => i.kind === 'trigger' && i.triggerId === resource.id);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.players.alice!.resources).toHaveLength(13);
  expect(s.cards[g.refs.technician!]!).toMatchObject({
    zone: 'resources',
    damage: 0,
    exhausted: false,
    controller: 'alice',
  });
  expect(s.cards[g.refs.claim!]!.zone).toBe('discard');
  expect(s.phaseHistory.defeated).toHaveLength(0);
  expect(
    s.facts.some(
      f => f.type === 'defeated' && f.cards.some(r => r.instanceId === g.refs.technician),
    ),
  ).toBe(false);
});
test('an opponent-owned Technician becomes a private resource of the invoking player and can be used for payment', () => {
  const p = board();
  p.players[1].ground = [{ card: 'superlaser-technician', ref: 'stolen', controller: 'alice' }];
  p.players[0].hand!.push({ card: 'ant-droid', ref: 'paid' });
  for (const r of p.players[0].resources!.slice(10)) r.exhausted = true;
  const g = scenario(p),
    pending = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.stolen);
  resume(pending, choose(pending, 'accept-effect'));
  const s = step(pending, 'accept-effect');
  expect(s.players.alice!.resources).toContain(g.refs.stolen!);
  expect(s.players.bob!.resources).not.toContain(g.refs.stolen!);
  expect(s.cards[g.refs.stolen!]!).toMatchObject({
    zone: 'resources',
    owner: 'bob',
    controller: 'alice',
    exhausted: false,
  });
  for (const playerId of ['alice', 'bob']) {
    const view = new Projector(s.gameId, { role: 'player', playerId }, 'v'.repeat(32)).project(s);
    const resource = view.cards.find(
      c => c.zone === 'resources' && c.owner === 'bob' && c.controller === 'alice',
    )!;
    expect(resource.face?.cardId ?? null).toBe(
      playerId === 'alice' ? 'superlaser-technician' : null,
    );
  }
  const spectator = new Projector(s.gameId, { role: 'spectator' }, 'v'.repeat(32)).project(s);
  expect(
    spectator.cards.find(
      c => c.zone === 'resources' && c.owner === 'bob' && c.controller === 'alice',
    )!.face,
  ).toBeNull();
  resume(s, choose(s, 'pass'));
  const paid = step(step(s, 'pass'), i => i.kind === 'play' && i.card === g.refs.paid);
  expect(paid.cards[g.refs.stolen!]!.exhausted).toBe(true);
  expect(paid.cards[g.refs.paid!]!.zone).toBe('ground');
  expect(decodeState(encodeState(paid))).toEqual(paid);
});

test('an actually defeated stolen Technician resources for the original ability controller', () => {
  const p = board();
  p.activePlayer = 'bob';
  p.players[1].ground = [{ card: 'superlaser-technician', ref: 'stolen', controller: 'alice' }];
  p.players[1].hand = [{ card: 'lost-and-forgotten' }];
  const g = scenario(p),
    pending = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.stolen);
  expect(pending.execution.decision!.playerId).toBe('alice');
  resume(pending, choose(pending, 'accept-effect'));
  const s = step(pending, 'accept-effect');
  expect(s.players.alice!.resources).toContain(g.refs.stolen!);
  expect(s.cards[g.refs.stolen!]!).toMatchObject({
    owner: 'bob',
    controller: 'alice',
    zone: 'resources',
  });
});
