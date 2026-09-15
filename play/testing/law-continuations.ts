import { advance } from '../engine/advance.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { ContinuationCase } from './continuations.ts';
export function lawContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const board = (id: string, card: string) => {
    const p = position(id);
    p.players[0].hand = [{ card, ref: 'source' }];
    p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    return p;
  };
  {
    const g = scenario(board('law-luke', 'luke-skywalker--profit-or-be-destroyed'));
    const state = advance(g.state, choose(g.state, 'play')).state;
    cases.push({
      name: 'law-opponent-mode',
      description: 'Opponent chooses Lukes mode before his controller chooses a damage target',
      state,
      input: choose(state, i => i.kind === 'choose-mode' && i.mode === 'damage-five'),
    });
  }
  {
    const p = board('law-pretend', 'secret-battle-of-pretend');
    p.players[1].ground!.push({ card: ids.marine, ref: 'second' });
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.ally),
    ).state;
    cases.push({
      name: 'law-aspect-exhaustion',
      description: 'Numeric minimum and maximum retain the exhausted sources aspects and arena',
      state,
      input: choose(state, 'accept-effect', [g.refs.enemy!, g.refs.second!]),
    });
  }
  {
    const p = board('law-rock', 'daring-delve');
    p.players[0].deck = [{ card: 'that-s-a-rock', ref: 'rock' }, { card: ids.marine }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(state, choose(state, 'accept-effect', [])).state;
    cases.push({
      name: 'law-discarded-event',
      description:
        'Discard-triggered event resolves from the exact discarded incarnation before mill recovery',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.enemy),
    });
  }
  {
    const p = board('law-salvaged', 'every-day--more-lies');
    p.players[0].hand!.push({ card: 'salvaged-blaster', ref: 'blaster' });
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(state, choose(state, 'accept-effect', [g.refs.blaster!])).state;
    state = advance(state, choose(state, 'accept-effect', [])).state;
    state = advance(state, choose(state, 'pass')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.card === g.refs.blaster),
    ).state;
    cases.push({
      name: 'law-discard-action',
      description: 'Exact discarded-card permission survives recovery and still pays its play cost',
      state,
      input: choose(state, 'play'),
    });
  }
  {
    const p = board('law-base-healing', 'nebulon-c-frigate');
    p.players[0].base.damage = 8;
    p.players[0].ground!.push({ card: 'shifty-suspects', ref: 'shifty' });
    const g = scenario(p);
    let state = advance(
      g.state,
      choose(
        g.state,
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.shifty &&
          i.defender === g.state.players.bob!.base,
      ),
    ).state;
    state = advance(state, choose(state, 'pass')).state;
    state = advance(state, choose(state, 'play')).state;
    cases.push({
      name: 'law-phase-healing-restriction',
      description: 'A resolved phase restriction still prevents base healing after reconnect',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === state.players.alice!.base),
    });
  }
  {
    const p = board('law-rio-owner', 'rio-durant--beckett-s-right-hands');
    p.players[1].ground = [{ card: ids.marine, ref: 'returned' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.returned),
    ).state;
    cases.push({
      name: 'law-owner-replay',
      description: 'The returned cards owner chooses whether to replay that exact copy free',
      state,
      input: choose(state, 'play'),
    });
  }
  {
    const p = board('law-choke-shield', 'choke-on-aspirations');
    p.players[0].base.damage = 8;
    p.attachments = [
      { card: 'shield', unit: 'ally', ref: 'one' },
      { card: 'shield', unit: 'ally', ref: 'two' },
    ];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.ally),
    ).state;
    state = advance(state, choose(state, 'accept-effect', [g.refs.ally!, g.refs.ally!])).state;
    cases.push({
      name: 'law-damage-after-shield',
      description:
        'Damage allocation retains its actual-damage healing continuation through replacement',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.one),
    });
  }
  {
    const p = board('law-salvaged-delay', 'salvaged-materials');
    p.players[0].discard = [{ card: 'han-s-golden-dice', ref: 'upgrade' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(state, choose(state, 'play')).state;
    state = advance(state, choose(state, 'pass')).state;
    cases.push({
      name: 'law-upgrade-regroup',
      description: 'A discarded events delayed operation defeats the played upgrade at regroup',
      state,
      input: choose(state, 'pass'),
    });
  }
  {
    const p = board('law-hunter', 'hunter-for-hire');
    p.players[0].hand = [];
    p.players[0].ground!.push({ card: 'hunter-for-hire', ref: 'hunter' });
    p.players[1].credits = ['coin'];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'pass')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.card === g.refs.hunter),
    ).state;
    cases.push({
      name: 'law-hunter-foreign-payment',
      description:
        'An enemy units action takes the activating players Credit before changing control',
      state,
      input: choose(state, 'accept-effect', [g.refs.coin!]),
    });
  }
  {
    const p = board('law-hondo', 'hondo-ohnaka--plays-by-his-own-rules');
    p.players[0].hand = [];
    p.players[0].ground!.push({ card: 'hondo-ohnaka--plays-by-his-own-rules', ref: 'hondo' });
    const g = scenario(p);
    const state = advance(
      g.state,
      choose(g.state, i => i.kind === 'use-ability' && i.card === g.refs.hondo),
    ).state;
    cases.push({
      name: 'law-private-top-play',
      description: 'Private top-deck permission and the paid once-per-round play resume together',
      state,
      input: choose(state, 'play'),
    });
  }
  {
    const p = board('law-fire', 'fire-across-the-galaxy');
    p.players[0].ground = [
      { card: 'chopper--spectre-three', ref: 'chopper' },
      { card: 'sabine-wren--spectre-five' },
    ];
    const g = scenario(p);
    const state = advance(g.state, choose(g.state, 'play')).state;
    cases.push({
      name: 'law-chosen-played-abilities',
      description:
        'A finite pool of explicit When Played abilities excludes Ambush and permits choosing none',
      state,
      input: choose(state, 'trigger'),
    });
  }
  {
    const p = board('law-printed-stats', 'obi-wan-kenobi--protector-of-felucia');
    p.players[0].hand = [];
    p.players[0].ground = [
      { card: 'obi-wan-kenobi--protector-of-felucia' },
      ...Array.from({ length: 6 }, (_, n) => ({ card: ids.marine, ref: `unit${n}` })),
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'sniper' }];
    p.attachments = [{ card: 'adventurer-sniper-rifle', unit: 'sniper' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'pass')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.card === g.refs.sniper),
    ).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.unit0),
    ).state;
    cases.push({
      name: 'law-printed-stat-priority',
      description:
        'A later printed HP replacement retains precedence over an active seven-unit stat ability',
      state,
      input: choose(state, 'pass'),
    });
  }
  {
    const p = board('law-vermillion', 'vermillion--qi-ra-s-auction-house');
    p.players[0].hand = [];
    p.players[0].space = [{ card: 'vermillion--qi-ra-s-auction-house', ref: 'ship' }];
    const g = scenario(p);
    let state = advance(
      g.state,
      choose(
        g.state,
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.ship &&
          i.defender === g.state.players.bob!.base,
      ),
    ).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'choose-mode' && i.mode === 'opponent-deck'),
    ).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'choose-mode' && i.mode === 'play-yourself'),
    ).state;
    cases.push({
      name: 'law-foreign-deck-play',
      description:
        'Playing the revealed foreign deck card retains ownership and the other players Credit reward',
      state,
      input: choose(state, 'play'),
    });
  }
  return cases;
}
