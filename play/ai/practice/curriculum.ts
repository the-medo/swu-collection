import { createHash } from 'node:crypto';
import { krennicExercises } from './krennic.ts';
import { runLine, type Exercise, type PracticeChoice } from './runner.ts';
import { leagueGameContract } from '../full-game/game.ts';

// Whole families are held out. Their rows never enter the optimizer, even when
// progress is poor. A final strength qualification needs another untouched set.
const heldOut = new Set(['too-late-to-sacrifice', 'galen-credit']);
const approved: Record<string, string> = {
  opening: 'Reference line',
  'discount-once': 'Pay for the second Ant',
  'missing-discount': 'Reference line',
  'space-wipe': 'Reference line',
  'sentinel-first': 'Survive',
  'too-late-to-sacrifice': 'Survive',
  'late-game-body': 'Win now',
  'koska-payoff': 'Synergy line',
  'arvel-credit': 'Survive',
  'galen-credit': 'Remove the suppression',
  'credits-not-resources': 'Pay for a stabilizer',
  'chimaera-targets': 'Reference line',
};
function variant(original: Exercise, n: number): Exercise {
  const input = structuredClone(original.input),
    own = input.players[0],
    other = input.players[1];
  input.gameId += `-variant-${n}`;
  // Keep lethal thresholds and exact heal/resource assertions intact. Every
  // resulting reference line is run through its existing outcome checks.
  if (n % 2) input.initiative.holder = 'p2';
  if (
    [
      'opening',
      'discount-once',
      'missing-discount',
      'late-game-body',
      'galen-credit',
      'credits-not-resources',
    ].includes(original.id)
  )
    own.base.damage = (own.base.damage ?? 0) + (n % 3);
  other.base.damage = (other.base.damage ?? 0) + (n % 3);
  if (n && !['opening', 'space-wipe', 'credits-not-resources'].includes(original.id)) {
    const i = own.deck!.findLastIndex(c => !c.ref);
    const [card] = own.deck!.splice(i, 1);
    own.resources!.push({ ...card!, exhausted: true });
  }
  if (n >= 2 && original.id !== 'opening') {
    const i = own.deck!.findLastIndex(c => !c.ref);
    own.hand!.push(own.deck!.splice(i, 1)[0]!);
  }
  // Different unseen deck orders and visible hand ordering. The staged opening
  // draw remains fixed; no deck order is provided to the learner.
  for (const player of input.players) {
    const ordered = player.deck!.filter(c => c.ref),
      rest = player.deck!.filter(c => !c.ref);
    player.deck = [...ordered, ...rest.slice(n), ...rest.slice(0, n)];
    if (n % 2) player.hand?.reverse();
  }
  return { ...original, input };
}
export const curriculumCases = krennicExercises.flatMap(exercise =>
  Array.from({ length: 4 }, (_, n) => {
    const split = heldOut.has(exercise.id) ? ('heldout' as const) : ('train' as const);
    const value = variant(exercise, split === 'heldout' ? n + 4 : n);
    const line = exercise.lines.find(line => line.label === approved[exercise.id]);
    if (!line) throw new Error(`No approved demonstration for ${exercise.id}`);
    return {
      id: `${exercise.id}-${n}`,
      family: exercise.id,
      title: exercise.title,
      split,
      exercise: value,
      line,
    };
  }),
);
export const curriculumManifest = {
  version: 'krennic-practice-v1',
  leader: 'krennic',
  hash: createHash('sha256')
    .update(
      JSON.stringify({
        contract: leagueGameContract,
        cases: curriculumCases.map(c => ({
          id: c.id,
          split: c.split,
          input: c.exercise.input,
          setup: c.exercise.setup,
          steps: c.line.steps,
        })),
      }),
    )
    .digest('hex'),
  metric: 'teacher-forced reference-choice agreement; not autonomous scenario success',
  cases: curriculumCases.map(({ id, family, title, split }) => ({ id, family, title, split })),
};
export function curriculumRows(id: string) {
  const item = curriculumCases.find(c => c.id === id);
  if (!item) throw new Error('Unknown curriculum case');
  const rows: PracticeChoice[] = [];
  runLine(item.exercise, item.line, { onChoice: row => rows.push(row) });
  return rows;
}
