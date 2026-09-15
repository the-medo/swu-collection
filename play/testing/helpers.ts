import type { GameState, EngineInput, Intent } from '../engine/model.ts';
import type { GameConfig } from '../engine/state.ts';
import type { ScenarioInput } from './scenario.ts';
import { LocalGame } from '../host/session.ts';

export const ids = {
  leader: 'sabine-wren--galvanized-revolutionary',
  base: 'command-center',
  marine: 'battlefield-marine',
  fighter: 'tie-ln-fighter',
  consular: 'consular-security-force',
  trooper: 'death-star-stormtrooper',
  racer: 'swoop-racer',
} as const;
export function config(gameId = 'test-game'): GameConfig {
  return {
    gameId,
    players: ['alice', 'bob'].map(id => ({
      id,
      base: ids.base,
      leader: ids.leader,
      deck: [
        { cardId: ids.marine, quantity: 12 },
        { cardId: ids.fighter, quantity: 6 },
        { cardId: ids.trooper, quantity: 6 },
      ],
    })) as GameConfig['players'],
  };
}
export function position(gameId = 'scenario-game'): ScenarioInput {
  return {
    gameId,
    activePlayer: 'alice',
    initiative: { holder: 'alice' },
    players: ['alice', 'bob'].map(id => ({
      id,
      base: { card: ids.base },
      leader: { card: ids.leader },
      deck: Array.from({ length: 12 }, () => ({ card: ids.marine })),
    })) as ScenarioInput['players'],
  };
}
export function choose(
  state: GameState,
  predicate: Intent['kind'] | ((intent: Intent) => boolean),
  selections: string[] = [],
): EngineInput {
  const decision = state.execution.decision;
  if (!decision) throw new Error('Expected a player decision');
  const option = decision.options.find(({ intent }) =>
    typeof predicate === 'string' ? intent.kind === predicate : predicate(intent),
  );
  if (!option) throw new Error(`Missing legal choice: ${String(predicate)}`);
  return {
    type: 'decision',
    gameId: state.gameId,
    expectedRevision: state.revision,
    playerId: decision.playerId,
    decisionId: decision.id,
    optionId: option.id,
    selections,
  };
}
export function setup(game: LocalGame, mulligan = false): GameState {
  let state = game.state;
  state = game.submit(
    choose(state, intent => intent.kind === 'initiative' && intent.playerId === 'alice'),
  );
  state = game.submit(
    choose(state, intent => intent.kind === 'mulligan' && intent.take === mulligan),
  );
  state = game.submit(choose(state, intent => intent.kind === 'mulligan' && !intent.take));
  for (let i = 0; i < 2; i++)
    state = game.submit(
      choose(state, 'resource', state.execution.decision!.selection!.cards.slice(0, 2)),
    );
  return state;
}
