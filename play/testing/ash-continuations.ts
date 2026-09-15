import { advance } from '../engine/advance.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { ContinuationCase } from './continuations.ts';
export function ashContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  {
    const p = position('continuation-red-leader');
    p.players[0].hand = [{ card: 'red-leader--strike-the-reactor' }];
    p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].space = [{ card: ids.fighter, ref: 'defender' }];
    const g = scenario(p);
    const state = advance(g.state, choose(g.state, 'play')).state;
    cases.push({
      name: 'ash-cross-arena-support',
      description: 'Borrow Red Leader’s cross-arena attack permission',
      state,
      input: choose(
        state,
        i =>
          i.kind === 'attack' && i.attacker === g.refs.attacker && i.defender === g.refs.defender,
      ),
    });
  }
  {
    const p = position('continuation-diplomatic');
    p.players[0].hand = [{ card: 'diplomatic-pageantry' }];
    p.players[0].resources = Array.from({ length: 4 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.ally),
    ).state;
    cases.push({
      name: 'ash-simultaneous-exhaustion',
      description: 'Select the second unit before simultaneous exhaustion',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.enemy),
    });
  }
  {
    const p = position('continuation-eye-of-sion');
    p.players[0].space = [{ card: 'eye-of-sion--delivered-from-exile', ref: 'eye' }];
    const g = scenario(p);
    let state = advance(
      g.state,
      choose(g.state, i => i.kind === 'use-ability' && i.card === g.refs.eye),
    ).state;
    state = advance(
      state,
      choose(state, 'search', [state.execution.decision!.selection!.cards[0]!]),
    ).state;
    cases.push({
      name: 'ash-ready-search-randomness',
      description: 'Randomize the search remainder before a free ready unit entry',
      state,
      input: {
        type: 'random',
        gameId: state.gameId,
        expectedRevision: state.revision,
        requestId: state.execution.random!.id,
        values: state.execution.random!.bounds.map(() => 0),
      },
    });
  }
  {
    const p = position('continuation-minefield');
    p.players[0].hand = [{ card: 'treacherous-minefield' }];
    p.players[0].resources = Array.from({ length: 4 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'choose-mode' && i.mode === 'ground'),
    ).state;
    state = advance(state, choose(state, 'pass')).state;
    cases.push({
      name: 'ash-lasting-attack-trigger',
      description: 'A Minefield ability remains attached to the exact current unit',
      state,
      input: choose(
        state,
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.attacker &&
          i.defender === state.players.bob!.base,
      ),
    });
  }
  {
    const p = position('continuation-conflict-ready');
    p.players[0].ground = [{ card: ids.consular, ref: 'host', exhausted: true }];
    p.players[0].resources = Array.from({ length: 3 }, () => ({
      card: ids.marine,
      exhausted: true,
    }));
    p.attachments = [{ card: 'the-conflict-within', unit: 'host', owner: 'bob' }];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'pass')).state;
    state = advance(state, choose(state, 'pass')).state;
    while (state.execution.decision!.kind === 'resource')
      state = advance(state, choose(state, 'resource', [])).state;
    cases.push({
      name: 'ash-regroup-ready-payment',
      description: 'Resolve a ready trigger before regroup ends with all resources ready',
      state,
      input: choose(state, 'accept-effect'),
    });
  }
  {
    const p = position('continuation-fateful-leader');
    p.activePlayer = 'bob';
    p.players[0].leader.deployedAs = 'unit';
    p.players[0].hand = [{ card: 'fateful-goodbye' }];
    p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    p.players[1].ground = [{ card: 'wookiee-chieftain', ref: 'enemy' }];
    p.attachments = [{ card: 'experience', unit: 'enemy', owner: 'bob' }];
    const g = scenario(p);
    let state = advance(
      g.state,
      choose(
        g.state,
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.enemy &&
          i.defender === g.state.players.alice!.leader,
      ),
    ).state;
    state = advance(state, choose(state, 'play')).state;
    cases.push({
      name: 'ash-departed-leader-allocation',
      description: 'The departing unit’s leader role determines the five-token allocation',
      state,
      input: choose(state, 'accept-effect', Array(5).fill(g.refs.ally!)),
    });
  }
  {
    const p = position('continuation-sense-number');
    p.players[0].hand = [{ card: 'sense-through-the-force' }];
    p.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    const numbered = choose(state, 'accept-effect');
    if (numbered.type !== 'decision') throw Error('Expected decision');
    cases.push({
      name: 'ash-number-choice',
      description: 'Choose a public number before inspecting the deck',
      state,
      input: { ...numbered, chosenNumber: 2 },
    });
    state = advance(state, { ...choose(state, 'accept-effect'), chosenNumber: 2 }).state;
    const input = choose(state, 'search', [state.execution.decision!.selection!.cards[0]!]);
    cases.push({
      name: 'ash-number-bound-search',
      description: 'The chosen number survives a private search',
      state,
      input,
    });
    state = advance(state, input).state;
    cases.push({
      name: 'ash-number-search-randomness',
      description: 'Randomize search remainder with the numeric comparison still pending',
      state,
      input: {
        type: 'random',
        gameId: state.gameId,
        expectedRevision: state.revision,
        requestId: state.execution.random!.id,
        values: state.execution.random!.bounds.map(() => 0),
      },
    });
  }
  {
    const p = position('continuation-wipe-excess');
    p.players[0].hand = [{ card: 'wipe-them-out' }];
    p.players[0].resources = Array.from({ length: 4 }, () => ({ card: ids.marine }));
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].ground = [
      { card: ids.trooper, ref: 'defender' },
      { card: ids.marine, ref: 'extra' },
    ];
    p.attachments = [
      { card: 'shield', unit: 'extra', owner: 'bob', ref: 'shield1' },
      { card: 'shield', unit: 'extra', owner: 'bob', ref: 'shield2' },
    ];
    const g = scenario(p);
    let state = advance(g.state, choose(g.state, 'play')).state;
    state = advance(
      state,
      choose(
        state,
        i =>
          i.kind === 'attack' && i.attacker === g.refs.attacker && i.defender === g.refs.defender,
      ),
    ).state;
    const input = choose(state, i => i.kind === 'target' && i.card === g.refs.extra);
    cases.push({
      name: 'ash-excess-destination',
      description: 'Choose another exact unit without committing simultaneous combat yet',
      state,
      input,
    });
    state = advance(state, input).state;
    cases.push({
      name: 'ash-excess-shield',
      description: 'Resolve the destination’s Shield before simultaneous combat commits',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.shield2),
    });
  }
  return cases;
}
