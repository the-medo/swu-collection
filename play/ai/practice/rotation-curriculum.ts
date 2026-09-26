import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { rosterEnvironment } from '../full-game/game.ts';
import { curriculumCases as krennicCases } from './curriculum.ts';
import { practiceRoster } from './positions.ts';
import { chewbaccaExercises } from './chewbacca.ts';
import { lukeExercises } from './luke.ts';
import { greefExercises, vaderExercises } from './aggro.ts';
import { mandalorianExercises, dedraExercises, aurraExercises } from './control.ts';
import { runLine, type PracticeChoice } from './runner.ts';

export const rotationEnvironment = rosterEnvironment(practiceRoster);
const sets = {
  greef: greefExercises,
  vader: vaderExercises,
  mandalorian: mandalorianExercises,
  dedra: dedraExercises,
  aurra: aurraExercises,
  chewbacca: chewbaccaExercises,
  luke: lukeExercises,
};
export const rotationCases = [
  ...krennicCases.map(c => ({ ...c, id: `krennic-${c.id}`, deck: 'krennic' })),
  ...Object.entries(sets).flatMap(([deck, exercises]) => {
    assert.equal(exercises.length, 12, `${deck} requires twelve whole families`);
    return exercises.flatMap((original, index) =>
      Array.from({ length: 4 }, (_, variant) => {
        const exercise = structuredClone({ ...original, lines: [] });
        // Equivalent card ordering and unseen deck-order variations. No hidden
        // identities are provided to the learner and all outcomes are rechecked.
        exercise.input.gameId += `-v${variant}`;
        for (const player of exercise.input.players) {
          if (variant % 2) player.hand?.reverse();
          if (variant >= 2) player.resources?.reverse();
          const fixed = player.deck!.filter(c => c.ref),
            rest = player.deck!.filter(c => !c.ref);
          player.deck = [...fixed, ...rest.slice(variant), ...rest.slice(0, variant)];
        }
        return {
          deck,
          id: `${original.id}-${variant}`,
          family: original.id,
          title: original.title,
          split: index >= 10 ? ('heldout' as const) : ('train' as const),
          exercise,
          line: original.lines[0]!,
        };
      }),
    );
  }),
];
export const rotationManifest = {
  version: 'eight-deck-practice-v1',
  hash: createHash('sha256')
    .update(
      JSON.stringify({
        contract: rotationEnvironment.contract,
        cases: rotationCases.map(c => ({
          id: c.id,
          deck: c.deck,
          split: c.split,
          input: c.exercise.input,
          setup: c.exercise.setup,
          steps: c.line.steps,
        })),
      }),
    )
    .digest('hex'),
  metric:
    'Teacher-forced reference-choice agreement; not autonomous scenario completion or win rate',
  cases: rotationCases.map(({ id, deck, family, title, split }) => ({
    id,
    deck,
    family,
    title,
    split,
  })),
};
export function rotationRows(id: string) {
  const item = rotationCases.find(c => c.id === id);
  assert(item, 'Unknown rotation practice case');
  const rows: PracticeChoice[] = [];
  runLine(item.exercise, item.line, {
    encoding: rotationEnvironment.encoding,
    deckIndex: practiceRoster.decks.findIndex(d => d.key === item.deck),
    onChoice: row => rows.push(row),
  });
  assert(rows.length > 0, `${id} has no learnable decisions`);
  return rows;
}
