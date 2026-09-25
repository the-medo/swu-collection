import { expect, test } from 'bun:test';
import { krennicExercises } from '../../ai/practice/krennic.ts';
import { runLine } from '../../ai/practice/runner.ts';
for (const exercise of krennicExercises)
  for (const line of exercise.lines)
    test(`Krennic practice: ${exercise.id} / ${line.label}`, () => {
      const run = runLine(exercise, line);
      expect(run.inputs.length + (exercise.setup?.length ?? 0)).toBeGreaterThan(0);
    });
