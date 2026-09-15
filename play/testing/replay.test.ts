import { expect, test } from 'bun:test';
import { runDemo } from './demo.ts';
import { advance } from '../engine/advance.ts';
import { LocalGame, replay } from '../host/session.ts';
import { choose, config } from './helpers.ts';
import { encodeState } from '../engine/checkpoint.ts';

test('a complete game through projected commands replays every accepted transition', () => {
  const { state, commands, recording } = runDemo('complete-game', true);
  expect(commands).toBeGreaterThan(15);
  expect(state.round).toBeGreaterThan(2);
  expect(state.result?.reason).toBe('base-defeat');
  expect(recording.inputs.filter(input => input.type === 'random').length).toBeGreaterThanOrEqual(
    3,
  );
  expect(state.facts.some(fact => fact.type === 'played')).toBe(true);
  expect(state.facts.some(fact => fact.type === 'attacked')).toBe(true);
  expect(state.facts.some(fact => fact.type === 'deployed')).toBe(true);
  const clone = JSON.parse(JSON.stringify(recording));
  expect(replay(clone)).toEqual(state);
  clone.inputs[0].values = [2];
  expect(() => replay(clone)).toThrow();
});

test('resume a serialized pending decision in a fresh process with identical continuation', async () => {
  const game = new LocalGame(config(), () => 0);
  const state = game.state,
    input = choose(state, 'initiative');
  const worker = Bun.spawn(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  worker.stdin.write(JSON.stringify({ state: encodeState(state), input }));
  worker.stdin.end();
  const output = await new Response(worker.stdout).text();
  const error = await new Response(worker.stderr).text();
  expect(await worker.exited).toBe(0);
  expect(error).toBe('');
  expect(JSON.parse(output)).toEqual(advance(state, input));
});
