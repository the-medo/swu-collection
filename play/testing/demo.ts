import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { config } from './helpers.ts';

// Drives only choices provided by the viewer's projection. The decision policy
// is a deterministic smoke harness, not an AI opponent or frontend implementation.
export function runDemo(gameId = 'crossfire-demo', deterministic = false) {
  const game = new LocalGame(config(gameId), deterministic ? upper => upper - 1 : undefined);
  const projectors = new Map(
    ['alice', 'bob'].map(playerId => [
      playerId,
      new Projector(gameId, { role: 'player', playerId }),
    ]),
  );
  let commands = 0;
  while (!game.state.result && commands < 1000) {
    const state = game.state;
    const viewer = projectors.get(state.execution.decision!.playerId)!;
    const view = viewer.project(state),
      decision = view.decision!;
    const option =
      decision.options.find(o => o.kind === 'initiative' && o.playerId === 'alice') ??
      decision.options.find(o => o.kind === 'mulligan' && o.takeMulligan === false) ??
      decision.options.find(o => o.kind === 'resource') ??
      decision.options.find(o => o.kind === 'use-ability' && o.action?.deploymentAvailable) ??
      decision.options.find(
        o =>
          o.kind === 'attack' && view.cards.find(c => c.id === o.cards[1])?.face?.kind === 'base',
      ) ??
      decision.options.find(o => o.kind === 'play') ??
      decision.options.find(o => o.kind === 'use-ability' && o.action?.id === 'damage-bases') ??
      decision.options.find(o => o.kind === 'take-initiative') ??
      decision.options.find(o => o.kind === 'pass');
    if (!option) throw new Error('Demo cannot resolve decision');
    const selection = decision.selection;
    const selections = selection ? selection.cards.slice(0, selection.min || selection.max) : [];
    game.submit(
      viewer.command(state, {
        gameId,
        epoch: view.epoch,
        expectedRevision: view.revision,
        decisionId: decision.id,
        optionId: option.id,
        selections,
      }),
    );
    if (JSON.stringify(replay(game.recording)) !== JSON.stringify(game.state))
      throw new Error('Accepted transition replay diverged');
    commands++;
  }
  const state = game.state;
  if (!state.result) throw new Error('Demo did not complete');
  if (JSON.stringify(replay(JSON.parse(JSON.stringify(game.recording)))) !== JSON.stringify(state))
    throw new Error('Replay diverged');
  return { state, recording: game.recording, commands };
}

if (import.meta.main) {
  const { state, commands } = runDemo();
  console.log(
    JSON.stringify(
      {
        gameId: state.gameId,
        round: state.round,
        commands,
        result: state.result,
        recordedInputsReproduceFinalState: true,
      },
      null,
      2,
    ),
  );
}
