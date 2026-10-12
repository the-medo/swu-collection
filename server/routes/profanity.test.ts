import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import app from '../app.ts';
import { auth } from '../auth/auth.ts';
import { db } from '../db';
import * as catalog from '../lib/cards/cardListProvider.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';
import { createPreparedComment } from '../lib/discussions/service.ts';
import { prepareCommentReferences } from '../lib/discussions/references.ts';
import type { DiscussionPolicy, DiscussionTransaction } from '../lib/discussions/policy.ts';
import { ProfanityError } from '../lib/moderation/content.ts';

const id = '10000000-0000-4000-8000-000000000001';
const secondId = '10000000-0000-4000-8000-000000000002';
const viewer = { id: 'profanity-fixture', email: 'fixture@invalid.local', role: 'user' };
const safeDeck = { id, userId: viewer.id, name: 'Assassin control', description: '', public: 0 };

// Keep the real app, auth middleware, schemas, services and error handler. Stub
// only session lookup and database reads; any attempted write fails the test.
function selectRows(rows: object[]) {
  return (() => {
    const selection = {
      innerJoin: () => selection,
      where: () =>
        Object.assign(Promise.resolve(rows), {
          limit: () => Promise.resolve(rows),
          for: () => Promise.resolve(rows),
        }),
    };
    return { from: () => selection };
  }) as unknown as typeof db.select;
}
beforeEach(() => {
  spyOn(auth.api, 'getSession').mockResolvedValue({
    user: viewer,
    session: { id: 'fixture' },
  } as Awaited<ReturnType<typeof auth.api.getSession>>);
  spyOn(auth.api, 'userHasPermission').mockResolvedValue({ success: false, error: null });
  for (const method of ['insert', 'update', 'transaction'] as const)
    spyOn(db, method).mockImplementation(() => {
      throw new Error('Rejected content reached persistence.');
    });
});
afterEach(() => mock.restore());

function request(path: string, body?: unknown, method = 'POST') {
  return app.request(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function rejected(response: Response, field: string) {
  expect(response.status).toBe(400);
  expect(response.headers.get('content-type')).toContain('application/json');
  expect(await response.json()).toMatchObject({ code: 'PROFANITY_NOT_ALLOWED', field });
  expect(db.insert).not.toHaveBeenCalled();
  expect(db.update).not.toHaveBeenCalled();
  expect(db.transaction).not.toHaveBeenCalled();
}
const dirtyDocument = () => {
  const document = emptyPostDocument();
  document.blocks = [
    {
      id: 'rejected',
      type: 'paragraph',
      props: {},
      children: [],
      content: [
        { type: 'text', text: 'fu', styles: {} },
        { type: 'text', text: 'ck', styles: { bold: true } },
      ],
    },
  ];
  return document;
};

test('normal deck creation rejects names and descriptions through the real app error handler', async () => {
  for (const field of ['name', 'description'])
    await rejected(
      await request('/deck', { name: 'Assassin control', format: 1, public: 0, [field]: 'fuck' }),
      field,
    );
});

test('normal deck editing rejects new text and publishing rejected legacy text', async () => {
  const read = spyOn(db, 'select').mockImplementation(selectRows([safeDeck]));
  for (const field of ['name', 'description'])
    await rejected(await request(`/deck/${id}`, { [field]: 'fuck' }, 'PUT'), field);
  read.mockImplementation(selectRows([{ ...safeDeck, name: 'fuck' }]));
  for (const visibility of [1, 2])
    await rejected(await request(`/deck/${id}`, { public: visibility }, 'PUT'), 'name');
});

test('copying an old deck checks both inherited text fields', async () => {
  const read = spyOn(db, 'select');
  for (const field of ['name', 'description']) {
    read.mockImplementation(selectRows([{ ...safeDeck, [field]: 'fuck' }]));
    await rejected(await request(`/deck/${id}/duplicate`), field);
  }
});

test('card-pool deck creation and editing use the same policy', async () => {
  for (const field of ['name', 'description'])
    await rejected(await request(`/card-pools/${id}/decks`, { [field]: 'fuck' }), field);
  const read = spyOn(db, 'select').mockImplementation(selectRows([safeDeck]));
  for (const field of ['name', 'description'])
    await rejected(
      await request(`/card-pools/${id}/decks/${secondId}`, { [field]: 'fuck' }, 'PATCH'),
      field,
    );
  read.mockImplementation(selectRows([{ ...safeDeck, description: 'fuck' }]));
  await rejected(
    await request(`/card-pools/${id}/decks/${secondId}`, { visibility: 'public' }, 'PATCH'),
    'description',
  );
});

test('both deck import APIs reject provider-supplied names before any writes', async () => {
  spyOn(catalog, 'getMergedCardList').mockResolvedValue({});
  spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ metadata: { name: 'fuck' }, deck: [], sideboard: [] }))
    .mockResolvedValueOnce(Response.json({ metadata: { name: 'fuck' }, deck: [], sideboard: [] }));
  await rejected(
    await request('/deck/import', { deckLink: 'https://swudb.com/deck/test', format: 1 }),
    'name',
  );
  await rejected(await request('/deck/import-swudb', { swudbDeckId: 'test', format: 1 }), 'name');
});

test('comments, comment edits, guides and bios reject formatted profanity before writes or notifications', async () => {
  spyOn(db, 'select').mockImplementation(selectRows([{ type: 'deck' }]));
  const content = dirtyDocument();
  await rejected(await request(`/discussions/${id}/comments`, { content }), 'content');
  await rejected(await request('/cards/fixture/discussion/comments', { content }), 'content');
  await rejected(
    await request(`/discussions/${id}/comments/${secondId}`, { content, revision: 1 }, 'PUT'),
    'content',
  );
  await rejected(
    await request(`/deck/${id}/article`, { content, revision: null }, 'PUT'),
    'content',
  );
  await rejected(
    await request(`/posts/profile/${viewer.id}`, { content, revision: null }, 'PUT'),
    'content',
  );
});

test('resource-specific first comments enforce moderation through the prepared-comment entry point', async () => {
  const select = mock(() => {
    throw new Error('Rejected content reached transaction queries.');
  });
  const references = await prepareCommentReferences(dirtyDocument());
  await expect(
    createPreparedComment(
      { select } as unknown as DiscussionTransaction,
      id,
      viewer.id,
      references,
      {} as DiscussionPolicy,
    ),
  ).rejects.toBeInstanceOf(ProfanityError);
  expect(select).not.toHaveBeenCalled();
});

test('authentication and ownership errors remain intact', async () => {
  spyOn(db, 'select').mockImplementation(selectRows([]));
  expect((await request(`/deck/${id}`, { name: 'fuck' }, 'PUT')).status).toBe(404);
  expect(
    (
      await request(
        '/posts/profile/someone-else',
        { content: dirtyDocument(), revision: null },
        'PUT',
      )
    ).status,
  ).toBe(403);
  spyOn(auth.api, 'getSession').mockResolvedValue(null);
  expect((await request('/deck', { name: 'fuck', format: 1, public: 0 })).status).toBe(401);
  expect((await request(`/discussions/${id}/comments`, { content: dirtyDocument() })).status).toBe(
    401,
  );
});

test('card pool names and descriptions are checked on creation, editing and sharing', async () => {
  for (const field of ['name', 'description'])
    await rejected(
      await request('/card-pools', { set: 'sor', type: 'sealed', custom: true, [field]: 'fuck' }),
      field,
    );
  const read = spyOn(db, 'select').mockImplementation(selectRows([safeDeck]));
  for (const field of ['name', 'description'])
    await rejected(await request(`/card-pools/${id}`, { [field]: 'fuck' }, 'PATCH'), field);
  read.mockImplementation(selectRows([{ ...safeDeck, name: 'fuck' }]));
  await rejected(await request(`/card-pools/${id}`, { visibility: 'unlisted' }, 'PATCH'), 'name');
});

test('teams check names, descriptions and public shortcuts on creation and editing', async () => {
  for (const field of ['name', 'description', 'shortcut'])
    await rejected(
      await request('/teams', { name: 'Assassin team', shortcut: 'safe-team', [field]: 'fuck' }),
      field,
    );
  const read = spyOn(db, 'select').mockImplementation(selectRows([{ ...safeDeck, role: 'owner' }]));
  for (const field of ['name', 'description', 'shortcut'])
    await rejected(await request(`/teams/${id}`, { [field]: 'fuck' }, 'PATCH'), field);
  read.mockImplementation(selectRows([{ ...safeDeck, role: 'owner', name: 'fuck' }]));
  await rejected(await request(`/teams/${id}`, { privacy: 'public' }, 'PATCH'), 'name');
  read.mockImplementation(selectRows([{ ...safeDeck, role: 'member' }]));
  expect((await request(`/teams/${id}`, { name: 'fuck' }, 'PATCH')).status).toBe(403);
});

test('collections, wantlists and card lists check titles, descriptions and copies', async () => {
  const payload = {
    title: 'Safe list',
    description: '',
    public: false,
    forSale: false,
    forDecks: false,
  };
  for (const collectionType of [1, 2, 3]) {
    for (const field of ['title', 'description'])
      await rejected(
        await request('/collection', { ...payload, collectionType, [field]: 'fuck' }),
        field,
      );
  }
  const read = spyOn(db, 'select').mockImplementation(selectRows([payload]));
  for (const field of ['title', 'description'])
    await rejected(await request(`/collection/${id}`, { [field]: 'fuck' }, 'PUT'), field);
  read.mockImplementation(selectRows([{ ...payload, description: 'fuck' }]));
  await rejected(await request(`/collection/${id}`, { public: true }, 'PUT'), 'description');
  await rejected(
    await request(`/collection/${id}/duplicate`, { title: 'New list', public: false }),
    'description',
  );
  read.mockImplementation(selectRows([payload]));
  await rejected(
    await request(`/collection/${id}/duplicate`, { title: 'fuck', public: false }),
    'title',
  );
});

test('shared folder names are checked on creation and editing', async () => {
  await rejected(await request('/deck-folders', { name: 'fuck' }), 'name');
  await rejected(await request(`/deck-folders/${id}`, { name: 'fuck' }, 'PUT'), 'name');
});

test.each([
  { dirty: 'root', linkEnabled: true, teamIds: [], status: 400 },
  { dirty: 'child', linkEnabled: true, teamIds: [], status: 400 },
  { dirty: 'child', linkEnabled: false, teamIds: [secondId], status: 400 },
  { dirty: 'deck-name', linkEnabled: true, teamIds: [], status: 400 },
  { dirty: 'deck-description', linkEnabled: false, teamIds: [secondId], status: 400 },
  { dirty: 'unrelated', linkEnabled: true, teamIds: [], status: 200 },
  { dirty: 'root', linkEnabled: false, teamIds: [], status: 200 },
  { dirty: 'root', linkEnabled: true, teamIds: [], status: 200, reducing: true },
])('folder sharing checks legacy names in the shared subtree: %j', async scenario => {
  const folder = { id, name: 'Root', parentId: null };
  const rows = [
    { ...folder, name: scenario.dirty === 'root' ? 'fuck' : 'Root' },
    { id: secondId, parentId: id, name: scenario.dirty === 'child' ? 'fuck' : 'Child' },
    { id: 'unrelated', parentId: null, name: 'fuck' },
  ];
  const reads: object[][] = [
    [{ id: viewer.id }],
    [folder],
    ...(scenario.teamIds.length ? [[{ id: secondId }]] : []),
    scenario.reducing
      ? [
          { audience: 'link', teamId: null },
          { audience: 'team', teamId: secondId },
        ]
      : [],
    rows,
    [
      {
        name: scenario.dirty === 'deck-name' ? 'fuck' : 'Assassin control',
        description: scenario.dirty === 'deck-description' ? 'fuck' : '',
      },
    ],
  ];
  const remove = mock(() => ({ where: () => Promise.resolve() }));
  const insert = mock(() => ({ values: () => Promise.resolve() }));
  const tx = {
    select: () => selectRows(reads.shift()!)(),
    delete: remove,
    insert,
  } as unknown as Parameters<Parameters<typeof db.transaction>[0]>[0];
  spyOn(db, 'transaction').mockImplementation(async callback => callback(tx));
  const response = await request(
    `/deck-folders/${id}/sharing`,
    { linkEnabled: scenario.linkEnabled, teamIds: scenario.teamIds },
    'PUT',
  );
  expect(response.status).toBe(scenario.status);
  if (scenario.status === 400) {
    expect(await response.json()).toMatchObject({
      code: 'PROFANITY_NOT_ALLOWED',
      field: scenario.dirty === 'deck-description' ? 'description' : 'name',
    });
    expect(remove).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  } else {
    expect(remove).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(scenario.linkEnabled ? 1 : 0);
  }
});
