import { expect, test } from 'bun:test';
import { WSContext } from 'hono/ws';
import { createSessionCheckedSocket } from './sessionCheckedSocket.ts';
const principal = { userId: 'user', sessionId: 'session' };
async function until(check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i++) await Bun.sleep(2);
  expect(check()).toBe(true);
}
function fixture(authorize: (identity: typeof principal) => Promise<unknown>) {
  const messages: unknown[] = [],
    closed: number[] = [];
  let cleanups = 0;
  const raw = {};
  const ws = new WSContext({
    raw,
    readyState: 1,
    send: data => messages.push(data),
    close: code => closed.push(code!),
  });
  return {
    ...createSessionCheckedSocket(
      ws,
      principal,
      () => {
        cleanups++;
      },
      authorize,
    ),
    messages,
    closed,
    cleanups: () => cleanups,
    raw,
  };
}
test('legacy frames preserve order, recheck access and stop immediately on revocation', async () => {
  let allowed = true;
  const checked: (typeof principal)[] = [];
  const f = fixture(async identity => {
    checked.push(identity);
    return allowed;
  });
  expect(f.socket.raw).toBe(f.raw);
  f.socket.send('first');
  f.socket.send('second');
  await until(() => f.messages.length === 2);
  expect(f.messages).toEqual(['first', 'second']);
  allowed = false;
  f.socket.send('private game result');
  f.socket.send('live tournament patch');
  await until(() => f.closed.length === 1);
  expect(f.messages).toEqual(['first', 'second']);
  expect(f.closed).toEqual([4401]);
  expect(f.cleanups()).toBe(1);
  expect(checked).toEqual([principal, principal, principal]);
});
test('authorization failures close safely without delivering queued private data', async () => {
  const f = fixture(async () => {
    throw Error('Database unavailable');
  });
  f.socket.send('private data');
  await until(() => f.closed.length === 1);
  expect(f.messages).toEqual([]);
  expect(f.closed).toEqual([1013]);
  expect(f.cleanups()).toBe(1);
});
test('disconnect and queue limits discard pending messages and release registrations', async () => {
  let release!: (value: boolean) => void;
  const f = fixture(
    () =>
      new Promise(resolve => {
        release = resolve;
      }),
  );
  f.socket.send('pending');
  await until(() => !!release);
  f.dispose();
  release(true);
  await Bun.sleep(10);
  expect(f.messages).toEqual([]);
  expect(f.cleanups()).toBe(1);
  const overloaded = fixture(async () => true);
  for (let i = 0; i < 65; i++) overloaded.socket.send('data');
  await until(() => overloaded.closed.length === 1);
  expect(overloaded.closed).toEqual([4408]);
  expect(overloaded.messages).toEqual([]);
  expect(overloaded.cleanups()).toBe(1);
});
