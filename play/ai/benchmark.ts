import { cpus, totalmem } from 'node:os';
import { PracticeArena, scriptedCommand } from './arena.ts';
import { versions } from '../engine/model.ts';

const games = Number(process.argv[2] ?? 10);
if (!Number.isInteger(games) || games < 1 || games > 100) throw new Error('Expected 1–100 games');
const start = performance.now();
let decisions = 0,
  completed = 0,
  cutoffs = 0,
  replayChecks = 0;
const durations: number[] = [];
const outcomes: Record<string, number> = {};
for (let seed = 0; seed < games; seed++) {
  const gameStart = performance.now();
  const arena = new PracticeArena(seed);
  let count = 0;
  while (count < 1000) {
    const observation = arena.observe();
    if (!observation) break;
    arena.step(scriptedCommand(observation.view));
    count++;
  }
  durations.push(performance.now() - gameStart);
  decisions += count;
  if (arena.result) {
    completed++;
    const winner = arena.result.winner ?? 'draw';
    outcomes[winner] = (outcomes[winner] ?? 0) + 1;
  } else cutoffs++;
  if (seed === 0 || seed === games - 1) {
    arena.verifyReplay();
    replayChecks++;
  }
}
const seconds = (performance.now() - start) / 1000;
console.log(
  JSON.stringify(
    {
      scope: 'synthetic 24-card practice decks, scripted policies; not model strength',
      versions,
      environment: {
        bun: Bun.version,
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        ramBytes: totalmem(),
      },
      games,
      completed,
      cutoffs,
      outcomes,
      decisions,
      seconds,
      completedGamesPerSecond: completed / seconds,
      decisionsPerSecond: decisions / seconds,
      gameMs: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        mean: durations.reduce((a, b) => a + b, 0) / games,
      },
      replayChecks,
      maxRssBytes: process.resourceUsage().maxRSS * 1024,
      limitations:
        'Single process; startup excluded, final sampled replay included in total; no database, network, or neural inference.',
    },
    null,
    2,
  ),
);
if (cutoffs) process.exitCode = 1;
