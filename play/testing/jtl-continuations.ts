import { attachPilot } from '../engine/pilot-conversion.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { GameState } from '../engine/model.ts';
import { mode } from './jtl-helpers.ts';
import { readyInPlay } from '../engine/ready.ts';
import { reference } from '../engine/state.ts';
import type { ContinuationCase } from './continuations.ts';
import { choose } from './helpers.ts';
import {
  board,
  play,
  attack,
  target,
  ids,
  step,
  select,
  refresh,
  nextOwn,
  drain,
} from './jtl-helpers.ts';
import { scenario } from './scenario.ts';
export function jtlContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const a = board('bb-8--happy-beeps');
  a.gameId = 'jtl-pilot-payment';
  a.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  a.players[1].space = [{ card: 'resistance-x-wing', exhausted: true, ref: 'enemy' }];
  const x = scenario(a);
  const payment = play(x.state, x.refs.source!, x.refs.host!);
  cases.push({
    name: 'jtl-pilot-payment',
    description: 'Recover BB-8 optional resources before its Resistance target',
    state: payment,
    input: choose(payment, 'accept-effect'),
  });
  const b = board('wingman-victor-three--backstabber');
  b.gameId = 'jtl-backstabber-target';
  b.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  b.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  const y = scenario(b);
  const choice = play(y.state, y.refs.source!, y.refs.host!);
  cases.push({
    name: 'jtl-backstabber-target',
    description: 'Resume the errata target excluding the exact attached unit',
    state: choice,
    input: choose(choice, i => i.kind === 'target' && i.card === y.refs.enemy),
  });
  const c = board('attack-run');
  c.gameId = 'jtl-second-attack';
  c.players[0].space = [
    { card: 'munificent-frigate', ref: 'first' },
    { card: 'munificent-frigate', ref: 'second' },
  ];
  const z = scenario(c);
  const second = attack(target(play(z.state, z.refs.source!), z.refs.first!), z.refs.first!);
  cases.push({
    name: c.gameId,
    description: 'Resume the second distinct space-unit attack',
    state: second,
    input: choose(second, i => i.kind === 'target' && i.card === z.refs.second),
  });
  const d = board('focus-fire');
  d.gameId = 'jtl-focus-shields';
  d.players[0].ground = [
    { card: 'occupier-siege-tank', ref: 'first' },
    { card: 'occupier-siege-tank', ref: 'second' },
  ];
  d.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  d.attachments = [
    { card: 'shield', unit: 'enemy' },
    { card: 'shield', unit: 'enemy' },
  ];
  const w = scenario(d);
  const shields = target(play(w.state, w.refs.source!), w.refs.enemy!);
  cases.push({
    name: d.gameId,
    description: 'Resume independent damage packets and exact Shield reservations',
    state: shields,
    input: choose(shields, () => true),
  });
  const e = board('all-wings-report-in');
  e.gameId = 'jtl-exhaust-count';
  e.players[0].space = [
    { card: 'munificent-frigate', ref: 'ready' },
    { card: 'munificent-frigate', ref: 'exhausted', exhausted: true },
  ];
  const u = scenario(e);
  const count = play(u.state, u.refs.source!);
  cases.push({
    name: e.gameId,
    description: 'Restore the selected units before counting successful exhaustion',
    state: count,
    input: choose(count, 'accept-effect', [u.refs.ready!, u.refs.exhausted!]),
  });
  const f = board('never-tell-me-the-odds');
  f.gameId = 'jtl-empty-mill';
  f.players[0].deck = [{ card: 'repair' }, { card: ids.marine }, { card: 'munificent-frigate' }];
  f.players[1].deck = [];
  f.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  const v = scenario(f);
  const mill = play(v.state, v.refs.source!);
  cases.push({
    name: f.gameId,
    description: 'Keep both mill groups after an empty opponent deck',
    state: mill,
    input: choose(mill, i => i.kind === 'target' && i.card === v.refs.enemy),
  });
  const base = board('close-the-shield-gate');
  base.gameId = 'jtl-base-prevention';
  base.players[0].hand!.push({ card: 'close-the-shield-gate', ref: 'second' });
  const bg = scenario(base);
  let bs = target(play(bg.state, bg.refs.source!), bg.state.players.alice!.base);
  bs = step(bs, 'pass');
  bs = target(play(bs, bg.refs.second!), bs.players.alice!.base);
  bs.execution.frames.unshift({
    kind: 'damage',
    actor: 'bob',
    assignments: [
      {
        target: reference(bs.cards[bs.players.alice!.base]!),
        source: structuredClone(bs.cards[bs.players.bob!.leader]!),
        amount: 5,
        preventedBy: null,
      },
    ],
  });
  refresh(bs);
  cases.push({
    name: base.gameId,
    description: 'Order two one-use base damage prevention effects',
    state: bs,
    input: choose(bs, () => true),
  });
  const kim = board('kimogila-heavy-fighter');
  kim.gameId = 'jtl-indirect-exhaust';
  kim.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  const kg = scenario(kim);
  const ks = step(
    play(kg.state, kg.refs.source!),
    i => i.kind === 'choose-player' && i.playerId === 'bob',
  );
  cases.push({
    name: kim.gameId,
    description: 'Allocate damage before exhausting its exact surviving recipients',
    state: ks,
    input: choose(ks, 'accept-effect', [kg.refs.unit!, ks.players.bob!.base, ks.players.bob!.base]),
  });
  const uw = board('u-wing-lander');
  uw.gameId = 'jtl-upgrade-transfer';
  uw.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const ug = scenario(uw);
  let us = nextOwn(play(ug.state, ug.refs.source!));
  us.cards[ug.refs.source!]!.exhausted = false;
  refresh(us);
  us = attack(us, ug.refs.source!);
  us = select(us, us.execution.decision!.selection!.cards[0]!);
  cases.push({
    name: uw.gameId,
    description: 'Keep the chosen attachment while selecting its new eligible host',
    state: us,
    input: choose(us, i => i.kind === 'target' && i.card === ug.refs.host),
  });
  const debt = board('in-debt-to-crimson-dawn');
  debt.gameId = 'jtl-readiness-debt';
  debt.players[1].ground = [{ card: ids.marine, exhausted: true, ref: 'host' }];
  debt.players[1].resources = [{ card: ids.marine }, { card: ids.marine }];
  const dg = scenario(debt);
  let ds = play(dg.state, dg.refs.source!, dg.refs.host!);
  readyInPlay(ds, [ds.cards[dg.refs.host!]!]);
  ds.execution.frames.unshift({ kind: 'flush-triggers' });
  refresh(ds);
  ds = drain(ds);
  cases.push({
    name: debt.gameId,
    description: 'Restore the host controller’s optional readiness payment',
    state: ds,
    input: choose(ds, 'accept-effect'),
  });
  const ani = board('anakin-skywalker--i-ll-try-spinning');
  ani.gameId = 'jtl-anakin-return';
  ani.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const ag = scenario(ani);
  const as = attack(nextOwn(play(ag.state, ag.refs.source!, ag.refs.host!)), ag.refs.host!);
  cases.push({
    name: ani.gameId,
    description: 'Return only the upgrade whose host survived attacking',
    state: as,
    input: choose(as, 'accept-effect', [ag.refs.source!]),
  });
  const prevent = board('i-have-you-now');
  prevent.gameId = 'jtl-attack-prevention';
  prevent.players[0].space = [{ card: 'banshee--crippling-command', ref: 'host', damage: 1 }];
  prevent.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const pg = scenario(prevent);
  const ps = attack(
    target(play(pg.state, pg.refs.source!), pg.refs.host!),
    pg.refs.host!,
    pg.refs.enemy!,
  );
  cases.push({
    name: prevent.gameId,
    description: 'Retain direct attack prevention across an On Attack damage choice',
    state: ps,
    input: choose(ps, i => i.kind === 'target' && i.card === pg.refs.host),
  });
  const poe = board('poe-dameron--one-hell-of-a-pilot');
  poe.gameId = 'jtl-poe-convert';
  const poeg = scenario(poe);
  const poes = play(poeg.state, poeg.refs.source!);
  const xwing = poes.space.find(id => poes.cards[id]!.cardId === 'x-wing')!;
  cases.push({
    name: poe.gameId,
    description: 'Convert Poe onto his freshly created X-Wing with its retained restriction',
    state: poes,
    input: choose(poes, i => i.kind === 'target' && i.card === xwing),
  });
  const phantom = board('phantom-ii--modified-to-dock', false);
  phantom.gameId = 'jtl-conversion-cleanup';
  phantom.players[0].space![0]!.damage = 4;
  phantom.players[0].space!.push({ card: 'the-ghost--home-of-the-spectres', ref: 'ghost' });
  phantom.attachments = [
    { card: 'luke-skywalker--you-still-with-me-', unit: 'source', ref: 'luke' },
  ];
  const phg = scenario(phantom);
  const phs = target(
    step(phg.state, i => i.kind === 'use-ability' && i.card === phg.refs.source),
    phg.refs.ghost!,
  );
  cases.push({
    name: phantom.gameId,
    description: 'Resume upgrade defeat replacement before finishing Phantom’s conversion',
    state: phs,
    input: choose(phs, 'accept-effect'),
  });
  const thief = board('pantoran-starship-thief');
  thief.gameId = 'jtl-thief-eject';
  thief.players[0].hand!.push({ card: 'eject', ref: 'eject' });
  thief.players[1].space = [{ card: 'cloaked-starviper', ref: 'host' }];
  const tg = scenario(thief);
  let ts = target(step(play(tg.state, tg.refs.source!), 'accept-effect'), tg.refs.host!);
  ts = play(nextOwn(ts), tg.refs.eject!);
  cases.push({
    name: thief.gameId,
    description: 'Detach the Thief and restore the former host’s owner',
    state: ts,
    input: choose(ts, i => i.kind === 'target' && i.card === tg.refs.source),
  });
  const plans = board('battlefield-marine');
  plans.gameId = 'jtl-plans-transfer';
  plans.players[0].hand = [];
  plans.activePlayer = 'bob';
  plans.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  plans.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  plans.attachments = [{ card: 'death-star-plans', unit: 'host', ref: 'plans' }];
  const plg = scenario(plans);
  const pls = attack(plg.state, plg.refs.attacker!, plg.refs.host!);
  cases.push({
    name: plans.gameId,
    description: 'The attacking player reattaches transferred Death Star Plans',
    state: pls,
    input: choose(pls, i => i.kind === 'target' && i.card === plg.refs.attacker),
  });
  const sweep = board('sweep-the-area');
  sweep.gameId = 'jtl-sweep-second-target';
  sweep.players[1].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.trooper, ref: 'second' },
  ];
  const sg = scenario(sweep);
  const ss = target(play(sg.state, sg.refs.source!), sg.refs.first!);
  cases.push({
    name: sweep.gameId,
    description: 'Select the second unit before both simultaneous returns',
    state: ss,
    input: choose(ss, i => i.kind === 'target' && i.card === sg.refs.second),
  });
  const sidon = board('sidon-ithano--the-crimson-corsair');
  sidon.gameId = 'jtl-sidon-board';
  sidon.players[1].space = [{ card: ids.fighter, ref: 'host' }];
  const sig = scenario(sidon);
  const sis = play(sig.state, sig.refs.source!);
  cases.push({
    name: sidon.gameId,
    description: 'Enemy-host conversion applies negative modifiers and maintenance',
    state: sis,
    input: choose(sis, i => i.kind === 'target' && i.card === sig.refs.host),
  });
  const fleet = board('admiral-yularen--fleet-coordinator');
  fleet.gameId = 'jtl-fleet-keyword';
  fleet.players[0].hand!.push({ card: 'munificent-frigate', ref: 'ship' });
  const fg = scenario(fleet);
  const fs = play(fg.state, fg.refs.source!);
  cases.push({
    name: fleet.gameId,
    description: 'Resume Yularen’s pinned keyword choice',
    state: fs,
    input: choose(fs, i => i.kind === 'choose-mode' && i.mode === 'shielded'),
  });
  const granted = nextOwn(mode(fs, 'shielded'));
  cases.push({
    name: 'jtl-future-shielded',
    description: 'Recover a persistent keyword grant before a later Vehicle enters',
    state: granted,
    input: choose(granted, i => i.kind === 'play' && i.card === fg.refs.ship),
  });
  function fixtureEffects(state: GameState, effect: CardEffect) {
    state.execution.decision = null;
    state.execution.frames.unshift(
      {
        kind: 'effect',
        playerId: 'alice',
        source: structuredClone(state.cards[state.players.alice!.leader]!),
        effect,
      },
      { kind: 'flush-triggers' },
    );
    refresh(state);
    return drain(state);
  }
  const l3 = board('l3-37--get-out-of-my-seat', false);
  l3.gameId = 'jtl-l3-host-choice';
  l3.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const lg = scenario(l3);
  const ls = fixtureEffects(lg.state, {
    kind: 'defeat-units',
    filter: { controller: 'friendly', arena: 'ground' },
  });
  cases.push({
    name: l3.gameId,
    description: 'Resume a unit-defeat replacement before the simultaneous event',
    state: ls,
    input: choose(ls, i => i.kind === 'target' && i.card === lg.refs.host),
  });
  const cleanup = structuredClone(l3);
  cleanup.gameId = 'jtl-l3-luke-cleanup';
  cleanup.players[0].ground!.push({ card: 'luke-skywalker--you-still-with-me-', ref: 'luke' });
  const cg = scenario(cleanup);
  attachPilot(
    cg.state,
    cg.state.cards[cg.refs.luke!]!,
    cg.state.cards[cg.refs.source!]!,
    cg.state.cards[cg.refs.luke!]!,
  );
  const cs = target(
    fixtureEffects(cg.state, {
      kind: 'defeat-units',
      filter: { controller: 'friendly', arena: 'ground' },
    }),
    cg.refs.host!,
  );
  cases.push({
    name: cleanup.gameId,
    description: 'Recover nested Pilot conversion cleanup before the unit-defeat group finishes',
    state: cs,
    input: choose(cs, 'accept-effect'),
  });
  const shadow = board('shadow-caster--just-business', false);
  shadow.gameId = 'jtl-caster-repeat';
  shadow.players[0].ground = [{ card: 'deceptive-shade', ref: 'victim' }];
  const shg = scenario(shadow);
  const shs = fixtureEffects(shg.state, {
    kind: 'defeat-units',
    filter: { controller: 'friendly', arena: 'ground' },
  });
  cases.push({
    name: shadow.gameId,
    description: 'Replay every captured defeat ability with its original unit incarnation',
    state: shs,
    input: choose(shs, 'accept-effect'),
  });
  const exploited = structuredClone(l3);
  exploited.gameId = 'jtl-l3-exploit';
  exploited.players[0].hand = [{ card: 'battle-droid-legion', ref: 'legion' }];
  exploited.players[0].credits = ['credit1'];
  const eg = scenario(exploited);
  const es = step(play(eg.state, eg.refs.legion!), 'accept-effect', [eg.refs.source!]);
  cases.push({
    name: exploited.gameId,
    description: 'Resume a replacement that fulfills an Exploit defeat cost',
    state: es,
    input: choose(es, i => i.kind === 'target' && i.card === eg.refs.host),
  });
  const ec = target(es, eg.refs.host!);
  cases.push({
    name: 'jtl-l3-exploit-credits',
    description: 'Resume payment after replaced Exploit without a false defeat event',
    state: ec,
    input: choose(ec, 'accept-effect'),
  });
  const jump = board('jump-to-lightspeed');
  jump.gameId = 'jtl-jump-attachments';
  jump.players[0].space = [{ card: 'munificent-frigate', ref: 'ship', damage: 8 }];
  jump.attachments = [{ card: 'academy-training', unit: 'ship', ref: 'upgrade' }];
  const jg = scenario(jump);
  const js = target(play(jg.state, jg.refs.source!), jg.refs.ship!);
  cases.push({
    name: jump.gameId,
    description: 'Return the selected attachment and lethally damaged host simultaneously',
    state: js,
    input: choose(js, 'accept-effect', [jg.refs.upgrade!]),
  });
  const returned = select(js, jg.refs.upgrade!);
  const offer = play(nextOwn(returned), jg.refs.ship!);
  cases.push({
    name: 'jtl-free-copy-choice',
    description: 'Recover a public declaration before choosing free payment',
    state: offer,
    input: choose(offer, i => i.kind === 'choose-mode' && i.mode === 'play-for-free'),
  });
  cases.push({
    name: 'jtl-normal-copy-choice',
    description: 'Pay the ordinary calculated cost instead of accepting the optional free play',
    state: offer,
    input: choose(offer, i => i.kind === 'choose-mode' && i.mode === 'pay-cost'),
  });
  const freeExploit = board('jump-to-lightspeed');
  freeExploit.gameId = 'jtl-free-copy-exploit';
  freeExploit.players[0].space = [{ card: 'battle-droid-legion', ref: 'ship', movedArena: true }];
  freeExploit.players[0].ground = [{ card: ids.marine, ref: 'payment' }];
  const feg = scenario(freeExploit);
  const fer = select(target(play(feg.state, feg.refs.source!), feg.refs.ship!));
  const fes = mode(play(nextOwn(fer), feg.refs.ship!), 'play-for-free');
  cases.push({
    name: freeExploit.gameId,
    description: 'A free card can still use its optional Exploit keyword',
    state: fes,
    input: choose(fes, 'accept-effect', [feg.refs.payment!]),
  });
  const hawk = board('the-starhawk--prototype-battleship', false);
  hawk.gameId = 'jtl-half-credit-payment';
  hawk.players[0].hand = [{ card: ids.marine, ref: 'marine' }];
  hawk.players[0].resources = [];
  hawk.players[0].credits = ['credit1'];
  const hg = scenario(hawk),
    hs = play(hg.state, hg.refs.marine!);
  cases.push({
    name: hawk.gameId,
    description: 'Spend exactly one Credit to satisfy a determined cost of two',
    state: hs,
    input: choose(hs, 'accept-effect', [hg.refs.credit1!]),
  });
  const tax = board('the-starhawk--prototype-battleship', false);
  tax.gameId = 'jtl-half-unit-tax';
  tax.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  const taxGame = scenario(tax),
    taxState = fixtureEffects(taxGame.state, { kind: 'tax-units', player: 'self', amount: 1 });
  cases.push({
    name: tax.gameId,
    description: 'Round each separate unit payment rather than halving their combined sum',
    state: taxState,
    input: choose(taxState, 'accept-effect', [
      taxGame.refs.source!,
      taxGame.refs.one!,
      taxGame.refs.two!,
    ]),
  });
  const both = board('the-starhawk--prototype-battleship', false);
  both.gameId = 'jtl-half-exploit-credits';
  both.players[0].hand = [{ card: 'battle-droid-legion', ref: 'legion' }];
  both.players[0].ground = [{ card: ids.marine, ref: 'sacrifice' }];
  both.players[0].credits = ['credit1'];
  const bothGame = scenario(both),
    bothState = select(play(bothGame.state, bothGame.refs.legion!), bothGame.refs.sacrifice!);
  cases.push({
    name: both.gameId,
    description: 'Resume Credits after Exploit reduces the cost and Starhawk reduces the payment',
    state: bothState,
    input: choose(bothState, 'accept-effect', [bothGame.refs.credit1!]),
  });
  return cases;
}
