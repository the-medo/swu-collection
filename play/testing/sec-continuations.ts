import { secChoiceContinuations } from './sec-choice-continuations.ts';
import { advance } from '../engine/advance.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { ContinuationCase } from './continuations.ts';
export function secContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const board = (card: string) => {
    const p = position(`sec-${card}`);
    p.players[0].hand = [{ card, ref: 'source' }];
    p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
    return p;
  };
  {
    const p = board('viper-probe-droid');
    p.players[1].hand = [{ card: ids.marine }];
    const g = scenario(p);
    const state = advance(g.state, choose(g.state, 'play')).state;
    cases.push({
      name: 'sec-private-hand-look',
      description: 'Only the controller inspects Viper Probe Droids opposing hand',
      state,
      input: choose(state, 'accept-effect'),
    });
  }
  {
    const p = board('kreia-s-whispers');
    p.players[0].deck = [
      { card: ids.fighter, ref: 'top' },
      { card: ids.marine, ref: 'bottom' },
      { card: ids.trooper },
    ];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(state, choose(state, 'accept-effect', [g.refs.top!])).state;
    cases.push({
      name: 'sec-private-second-deck-choice',
      description: 'Kreias second choice keeps the earlier top placement private',
      state,
      input: choose(state, 'accept-effect', [g.refs.bottom!]),
    });
  }
  {
    const p = board('duchess-s-investigators');
    p.players[0].hand!.push({ card: 'surprise-strike', ref: 'icon' });
    p.players[1].hand = [{ card: ids.fighter }, { card: ids.marine }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(state, choose(state, 'accept-effect', [g.refs.icon!])).state;
    if (!state.execution.random) throw Error('Expected server random discard');
    cases.push({
      name: 'sec-disclosed-random-discard',
      description: 'The opposing hand stays server-only while choosing a uniform random discard',
      state,
      input: {
        type: 'random',
        gameId: state.gameId,
        expectedRevision: state.revision,
        requestId: state.execution.random.id,
        values: state.execution.random.bounds.map(() => 0),
      },
    });
  }
  {
    const p = board('grand-moff-tarkin--taking-krennic-s-achievement');
    p.players[1].space = [{ card: ids.fighter, ref: 'vehicle' }];
    const g = scenario(p);
    const state = advance(g.state, choose(g.state, 'play')).state;
    cases.push({
      name: 'sec-vehicle-control',
      description: 'A chosen exact Vehicle retains its owner and source-departure control return',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.vehicle),
    });
  }
  {
    const p = board('death-trooper');
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.source),
    ).state;
    cases.push({
      name: 'sec-simultaneous-trooper-damage',
      description:
        'The first ground-unit selection stays bound until both damage recipients are chosen',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.enemy),
    });
  }
  {
    const p = board('when-has-become-now');
    p.players[0].resources!.push({ card: 'dogmatic-shock-squad', ref: 'plot' });
    const g = scenario(p);
    const state = advance(g.state, choose(g.state, 'play')).state;
    cases.push({
      name: 'sec-explicit-resource-play',
      description: 'A card effect authorizes a Plot resource play and conditional replacement',
      state,
      input: choose(state, i => i.kind === 'play' && i.card === g.refs.plot),
    });
  }
  {
    const p = board('libertine--under-new-ownership');
    p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
    p.players[1].space = [{ card: ids.fighter, ref: 'guard' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.guard),
    ).state;
    cases.push({
      name: 'sec-history-capture-owner',
      description: 'The chosen enemy guard remains bound while choosing a friendly prisoner',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.friendly),
    });
  }
  {
    const p = board('fully-armed-and-operational');
    p.activePlayer = 'bob';
    p.players[0].hand!.push({ card: ids.consular, ref: 'unit' });
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    const state = advance(
      g.state,
      choose(
        g.state,
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.enemy &&
          i.defender === g.state.players.alice!.base,
      ),
    ).state;
    cases.push({
      name: 'sec-history-previous-action',
      description: 'The opponent previous action base attack grants a later paid play',
      state,
      input: choose(state, i => i.kind === 'play' && i.card === g.refs.source),
    });
  }
  {
    const p = board('implicate');
    p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.host),
    ).state;
    cases.push({
      name: 'sec-history-defending-trigger',
      description: 'A lasting attacked trigger survives its source event and a process restart',
      state,
      input: choose(
        state,
        i => i.kind === 'attack' && i.attacker === g.refs.enemy && i.defender === g.refs.host,
      ),
    });
  }
  {
    const p = board('oppression-breeds-rebellion');
    p.players[0].ground = [{ card: ids.trooper, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let state = advance(
      g.state,
      choose(
        g.state,
        i => i.kind === 'attack' && i.attacker === g.refs.attacker && i.defender === g.refs.enemy,
      ),
    ).state;
    state = advance(state, choose(state, 'pass')).state;
    cases.push({
      name: 'sec-history-defeated-attacker',
      description:
        'A defeated attacking unit remains in phase history when its controller later plays an event',
      state,
      input: choose(state, i => i.kind === 'play' && i.card === g.refs.source),
    });
  }
  return [...cases, ...secChoiceContinuations()];
}
