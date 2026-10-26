import { describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { createDeckFromListRoute } from './post.ts';
import { InvalidDecklistError } from '../../../lib/decks/createDeckFromList.ts';
import type { Deck } from '../../../db/schema/deck.ts';
import { zDeckFromListRequest } from '../../../../types/DeckFromList.ts';

const payload = {
  leaderCardId: 'leader',
  baseCardId: 'base',
  cards: { unit: { 1: 3, 2: 2, 3: 1 } },
};
const created: Deck = {
  id: crypto.randomUUID(),
  userId: 'owner',
  format: 1,
  name: 'Combined deck',
  description: '',
  public: 0,
  cardPoolId: null,
  leaderCardId1: 'leader',
  leaderCardId2: null,
  baseCardId: 'base',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const fixture = (create = mock(async () => created)) => {
  let time = 0;
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      const id = c.req.header('Test-User');
      c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
      await next();
    })
    .route(
      '/from-list',
      createDeckFromListRoute(create, () => time),
    );
  return {
    create,
    advance: (ms: number) => {
      time += ms;
    },
    send: (body: unknown = payload, user: string | undefined = 'owner') =>
      app.request('/from-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(new TextEncoder().encode(JSON.stringify(body)).length),
          ...(user ? { 'Test-User': user } : {}),
        },
        body: JSON.stringify(body),
      }),
  };
};

describe('POST /deck/from-list', () => {
  test('requires authentication and uses the authenticated owner', async () => {
    const f = fixture();
    expect((await f.send(payload, '')).status).toBe(401);
    expect(f.create).not.toHaveBeenCalled();
    const response = await f.send({ ...payload, userId: 'someone-else' });
    expect(response.status).toBe(201);
    expect(f.create).toHaveBeenCalledWith('owner', { ...payload, name: 'Combined deck', format: 1 });
  });

  test.each([-1, 1.5, '3', null, 2147483648])('rejects invalid quantity %j', async quantity => {
    const f = fixture();
    expect((await f.send({ ...payload, cards: { unit: { 1: quantity } } })).status).toBe(400);
    expect(f.create).not.toHaveBeenCalled();
  });

  test('accepts 60 different cards across boards and rejects the 61st', async () => {
    const f = fixture();
    const cards = Object.fromEntries(
      Array.from({ length: 60 }, (_, i) => [`card-${i}`, { 1: 3, 2: 1, 3: 1 }]),
    );
    expect((await f.send({ ...payload, cards: { ...cards, extra: { 1: 1 } } })).status).toBe(400);
    expect((await f.send({ ...payload, cards })).status).toBe(201);
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  test('rejects unsupported boards, formats, missing leaders and oversized bodies', async () => {
    const f = fixture();
    for (const data of [
      { ...payload, cards: { unit: { 4: 1 } } },
      { ...payload, format: 999 },
      { ...payload, leaderCardId: '' },
      { ...payload, baseCardId: '' },
    ]) {
      expect((await f.send(data)).status).toBe(400);
    }
    expect((await f.send({ ...payload, name: 'x'.repeat(65536) })).status).toBe(413);
    expect(f.create).not.toHaveBeenCalled();
  });

  test('enforces a per-user 30-second cooldown from successful creation', async () => {
    const f = fixture();
    expect((await f.send()).status).toBe(201);
    expect((await f.send(payload, 'other')).status).toBe(201);
    expect((await f.send()).headers.get('Retry-After')).toBe('30');
    f.advance(29_999);
    const limited = await f.send();
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('1');
    f.advance(1);
    expect((await f.send()).status).toBe(201);
    expect(f.create).toHaveBeenCalledTimes(3);
  });

  test('reserves the user while creation is pending, even beyond 30 seconds', async () => {
    let finish!: (deck: Deck) => void;
    let entered!: () => void;
    const started = new Promise<void>(resolve => {
      entered = resolve;
    });
    const f = fixture(
      mock(() => {
        entered();
        return new Promise<Deck>(resolve => {
          finish = resolve;
        });
      }),
    );
    const first = f.send();
    await started;
    f.advance(60_000);
    expect((await f.send()).status).toBe(429);
    finish(created);
    expect((await first).status).toBe(201);
    expect((await f.send()).status).toBe(429);
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  test('failed creation releases the reservation', async () => {
    const f = fixture(
      mock(async () => {
        throw new InvalidDecklistError('Unknown card');
      }),
    );
    expect((await f.send()).status).toBe(400);
    expect((await f.send()).status).toBe(400);
    expect(f.create).toHaveBeenCalledTimes(2);
  });

  test('supports a second leader only for two-leader formats', () => {
    expect(zDeckFromListRequest.safeParse({ ...payload, format: 2 }).success).toBe(false);
    expect(
      zDeckFromListRequest.safeParse({ ...payload, format: 2, leaderCardId2: 'leader' }).success,
    ).toBe(false);
    expect(
      zDeckFromListRequest.safeParse({ ...payload, format: 2, leaderCardId2: 'second-leader' })
        .success,
    ).toBe(true);
    expect(
      zDeckFromListRequest.safeParse({ ...payload, leaderCardId2: 'second-leader' }).success,
    ).toBe(false);
  });
});
