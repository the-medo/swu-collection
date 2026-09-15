import { advance } from '../engine/advance.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { GameState, Intent } from '../engine/model.ts';
import type { ContinuationCase } from './continuations.ts';
export function lofEffectContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const step = (s: GameState, p: Intent['kind'] | ((i: Intent) => boolean), cards: string[] = []) =>
    advance(s, choose(s, p, cards)).state;
  const board = (card: string) => {
    const p = position(`lof-${card}`);
    p.players[0].hand = [{ card, ref: 'source' }];
    p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
    return p;
  };
  {
    const p = board('it-s-worse');
    p.players[0].ground = [{ card: 'sifo-dyas--commissioning-an-army', ref: 'sifo' }];
    p.players[0].deck = [
      { card: 'clone-pilot', ref: 'a' },
      { card: 'point-rain-reclaimer', ref: 'b' },
      ...Array.from({ length: 7 }, () => ({ card: ids.marine })),
    ];
    const g = scenario(p);
    let state = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.sifo);
    const input = choose(state, 'search', [g.refs.a!, g.refs.b!]);
    cases.push({
      name: 'lof-search-multiple-permissions',
      description: 'Select several Clones whose later free plays need separate exact permissions',
      state,
      input,
    });
    state = advance(state, input).state;
    const random = state.execution.random!;
    cases.push({
      name: 'lof-search-discard-randomness',
      description:
        'Shuffle the unselected prefix before discarding and granting every selected card',
      state,
      input: {
        type: 'random',
        gameId: state.gameId,
        expectedRevision: state.revision,
        requestId: random.id,
        values: random.bounds.map(() => 0),
      },
    });
  }
  {
    const p = board('baylan-skoll--enigmatic-master');
    p.players[0].force = true;
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let state = step(step(g.state, 'play'), 'accept-effect');
    state = step(state, i => i.kind === 'target' && i.card === g.refs.enemy);
    cases.push({
      name: 'lof-returned-owner-play',
      description: 'The opposing owner may replay their exact returned card for free',
      state,
      input: choose(state, i => i.kind === 'play' && i.card === g.refs.enemy),
    });
  }
  {
    const p = board('heavy-blaster-cannon');
    p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
    p.attachments = [
      { card: 'shield', unit: 'enemy', ref: 'shield-a' },
      { card: 'shield', unit: 'enemy', ref: 'shield-b' },
    ];
    const g = scenario(p);
    let state = step(
      g.state,
      i => i.kind === 'play' && i.card === g.refs.source && i.target === g.refs.host,
    );
    state = step(state, i => i.kind === 'target' && i.card === g.refs.enemy);
    cases.push({
      name: 'lof-sequential-cannon-damage',
      description:
        'Choosing the first Shield preserves the next two separate one-damage instructions',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs['shield-a']),
    });
  }
  {
    const p = board('do-or-do-not');
    p.players[0].force = true;
    p.players[0].ground = [{ card: 'the-father--maintaining-balance', ref: 'father' }];
    p.attachments = [{ card: 'shield', unit: 'father' }];
    const g = scenario(p);
    const state = step(step(g.state, 'play'), 'accept-effect');
    cases.push({
      name: 'lof-renew-force-after-payment',
      description:
        'After the earlier Force ability completes, optional replaced self-damage can regain Force',
      state,
      input: choose(state, i => i.kind === 'target' && i.card === g.refs.father),
    });
  }
  {
    const p = board('watto--no-money--no-parts--no-deal');
    p.players[0].ground = [{ card: 'watto--no-money--no-parts--no-deal', ref: 'watto' }];
    p.players[0].hand = [];
    const g = scenario(p);
    const state = step(
      g.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === g.refs.watto &&
        i.defender === g.state.players.bob!.base,
    );
    cases.push({
      name: 'lof-opponent-benefit-choice',
      description: 'The opponent chooses Watto’s benefit for the original ability controller',
      state,
      input: choose(state, i => i.kind === 'choose-mode' && i.mode === 'give-experience'),
    });
  }
  {
    const p = board('force-speed');
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
    p.attachments = [
      { card: 'academy-training', unit: 'enemy', ref: 'first' },
      { card: 'academy-training', unit: 'enemy', ref: 'second' },
    ];
    const g = scenario(p);
    let state = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.ally);
    state = step(
      state,
      i => i.kind === 'attack' && i.attacker === g.refs.ally && i.defender === g.refs.enemy,
    );
    cases.push({
      name: 'lof-granted-upgrade-return',
      description:
        'A granted On Attack ability retains its event origin and the exact defending upgrades',
      state,
      input: choose(state, 'accept-effect', [g.refs.first!]),
    });
  }
  return cases;
}
