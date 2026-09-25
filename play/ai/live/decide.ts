import type { GameState } from '../../engine/model.ts';
import { Projector } from '../../projection/projector.ts';
import { catalogFor } from '../../cards/catalog.ts';
import { CommandBuilder, makeNameChoices } from '../full-game/choices.ts';
import { VisibleMemory } from '../full-game/encoding.ts';
import type { releaseRuntime } from '../releases/runtime.ts';

/** The policy sees a seat projection only. It never receives a GameState. */
export async function decideAiCommand(
  state: GameState,
  runtime: ReturnType<typeof releaseRuntime>,
  choose: (observation: { context: number[]; candidates: number[][] }) => Promise<number>,
) {
  if (state.result || state.execution.decision?.playerId !== 'p2') return null;
  const projector = new Projector(state.gameId, { role: 'player', playerId: 'p2' });
  const view = projector.project(state),
    memory = new VisibleMemory();
  memory.observe(view, 'p2');
  const builder = new CommandBuilder(view, makeNameChoices(catalogFor(state).data.titles));
  for (let n = 0; n < 512; n++) {
    const choices = builder.choices();
    if (!choices.length) throw new Error('AI has no legal completion');
    const action =
      choices.length === 1
        ? 0
        : await choose({
            context: runtime.encoding.encodeContext(view, 'p2', runtime.deckIndex, memory, builder),
            candidates: choices.map(c => runtime.encoding.encodeCandidate(builder, c, 'p2')),
          });
    if (!Number.isSafeInteger(action) || !choices[action]) throw new Error('Invalid AI action');
    builder.choose(choices[action]!);
    if (builder.stage === 'done') return projector.command(state, builder.command());
  }
  throw new Error('AI decision exceeded completion budget');
}
