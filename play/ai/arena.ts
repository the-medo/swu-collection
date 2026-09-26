import { isDeepStrictEqual } from 'node:util';
import { LocalGame, replay } from '../host/session.ts';
import type { GameConfig } from '../engine/state.ts';
import { versions } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import type { GameView, ViewCommand } from '../view/types.ts';
import { randomSource } from './random.ts';

// Synthetic core-practice decks for measuring the harness, not tournament lists.
export function practiceConfig(seed: number): GameConfig {
  return {
    gameId: `ai-arena-${seed}`,
    versions,
    players: ['alice', 'bob'].map((id, seat) => ({
      id,
      base: 'command-center',
      leader: 'sabine-wren--galvanized-revolutionary',
      deck: [
        { cardId: 'battlefield-marine', quantity: seat === 0 ? 9 : 6 },
        { cardId: 'tie-ln-fighter', quantity: 6 },
        { cardId: 'death-star-stormtrooper', quantity: 6 },
        { cardId: 'swoop-racer', quantity: seat === 0 ? 3 : 6 },
      ],
    })) as GameConfig['players'],
  };
}

export function commandFor(view: GameView, option: number, selections: string[] = []): ViewCommand {
  const decision = view.decision;
  if (!decision || !Number.isInteger(option) || !decision.options[option])
    throw new Error('Missing or invalid decision option');
  return {
    gameId: view.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: decision.id,
    optionId: decision.options[option]!.id,
    selections,
  };
}

export class PracticeArena {
  readonly #game: LocalGame;
  readonly #projectors: Map<string, Projector>;
  constructor(seed: number) {
    const config = practiceConfig(seed);
    this.#game = new LocalGame(config, randomSource(seed));
    this.#projectors = new Map(
      config.players.map(player => [
        player.id,
        new Projector(config.gameId, { role: 'player', playerId: player.id }),
      ]),
    );
  }
  observe(): { playerId: string; view: GameView } | null {
    const state = this.#game.state;
    if (state.result) return null;
    const playerId = state.execution.decision?.playerId;
    if (!playerId) throw new Error('Arena failed to settle to a player decision');
    return { playerId, view: this.#projectors.get(playerId)!.project(state) };
  }
  step(command: ViewCommand): void {
    const state = this.#game.state;
    const playerId = state.execution.decision?.playerId;
    if (!playerId) throw new Error('Arena is not waiting for a decision');
    this.#game.submit(this.#projectors.get(playerId)!.command(state, command));
  }
  get result() {
    return this.#game.state.result;
  }
  verifyReplay(): void {
    if (!isDeepStrictEqual(replay(this.#game.recording), this.#game.state))
      throw new Error('Arena replay diverged');
  }
}

// Deliberately simple visible-information baseline for this synthetic deck pool.
// It is a harness reference, not the competent full-game baseline in the plan.
export function scriptedCommand(view: GameView): ViewCommand {
  const decision = view.decision;
  if (!decision) throw new Error('Scripted policy needs a decision');
  const allowed = new Set([
    'initiative',
    'mulligan',
    'resource',
    'use-ability',
    'attack',
    'play',
    'take-initiative',
    'pass',
    'trigger-player',
    'trigger',
  ]);
  if (decision.options.some(option => !allowed.has(option.kind)))
    throw new Error(
      `Unsupported baseline options: ${decision.options.map(o => o.kind).join(', ')}`,
    );
  const selection = decision.selection;
  if (
    selection &&
    (decision.kind !== 'resource' || selection.budget || selection.allocation || selection.disclose)
  )
    throw new Error('Unsupported baseline selection contract');
  const cards = new Map(view.cards.map(card => [card.id, card]));
  const score = (option: (typeof decision.options)[number]) => {
    if (option.kind === 'initiative') return 100;
    if (option.kind === 'mulligan') return option.takeMulligan ? -1 : 100;
    if (option.kind === 'resource') return 100;
    if (option.kind === 'use-ability' && option.action?.deploymentAvailable) return 90;
    if (option.kind === 'attack')
      return cards.get(option.cards[1]!)?.face?.kind === 'base' ? 80 : 40;
    if (option.kind === 'play') return 70;
    if (option.kind === 'use-ability') return 60;
    if (option.kind === 'take-initiative') return 30;
    if (option.kind === 'pass') return 0;
    return 50;
  };
  const index = decision.options.reduce(
    (best, option, i) => (score(option) > score(decision.options[best]!) ? i : best),
    0,
  );
  return commandFor(view, index, selection ? selection.cards.slice(0, selection.max) : []);
}
