import { expect, test } from 'bun:test';
import { buildPQMetaReassignmentPlan, type PQMetaSnapshot } from './pqMetaReassignmentPlan.ts';
import { zPQMetaReassignmentRequest } from '../../../types/PQMetaReassignment.ts';

const request = {
  fromDate: '2026-11-28',
  targets: [
    { formatId: 1 as const, metaId: 22 },
    { formatId: 6 as const, metaId: 23 },
  ],
};
function fixture(): PQMetaSnapshot {
  const tournaments = [
    { id: 'premier', format: 1, meta: 19, date: '2026-11-28', imported: true },
    { id: 'eternal', format: 6, meta: 21, date: '2027-01-31', imported: false },
    { id: 'sealed', format: 3, meta: 20, date: '2026-11-28', imported: false },
    { id: 'past', format: 1, meta: 19, date: '2026-11-27', imported: false },
    { id: 'assigned', format: 1, meta: 22, date: '2026-11-29', imported: false },
  ].map(t => ({ ...t, name: t.id, type: 'pq', updatedAt: '2026-11-01 00:00:00.000001' }));
  return {
    metas: [
      { id: 19, format: 1 },
      { id: 20, format: 3 },
      { id: 21, format: 6 },
      { id: 22, format: 1 },
      { id: 23, format: 6 },
    ].map(m => ({ ...m, name: `Meta ${m.id}`, set: 'fixture', date: '2026-11-28' })),
    tournaments,
    groups: [
      { id: 'group', name: 'PQ Week 4', metaId: 19 },
      { id: 'featured', name: 'Featured events', metaId: 19 },
      { id: 'empty', name: 'PQ Week 5', metaId: 19 },
    ],
    members: [
      { groupId: 'group', tournament: tournaments[0]! },
      { groupId: 'featured', tournament: tournaments[0]! },
    ],
    weekendGroups: [
      {
        tournamentGroupId: 'group',
        tournamentWeekendId: 'weekend',
        formatId: 1,
        metaId: 19,
        date: '2026-11-28',
        name: 'November weekend',
      },
    ],
  };
}

test('inclusive cutoff, per-format targets, sealed/past exclusion and existing week identity', () => {
  const { preview, statisticsMetaIds } = buildPQMetaReassignmentPlan(request, fixture());
  expect(preview.tournaments.map(t => [t.id, t.toMetaId])).toEqual([
    ['eternal', 23],
    ['premier', 22],
  ]);
  expect(preview.groups).toMatchObject([
    { id: 'group', name: 'PQ Week 4', fromMetaId: 19, toMetaId: 22 },
  ]);
  expect(preview.weekendGroups).toMatchObject([
    { id: 'group', weekendId: 'weekend', toMetaId: 22 },
  ]);
  expect(preview.formats[0]).toMatchObject({ tournaments: 1, alreadyAssigned: 1 });
  expect(preview.sealedCount).toBe(1);
  expect(preview.conflicts).toEqual([]);
  expect(statisticsMetaIds).toEqual([19, 22]);
});

test('rejects invalid dates, repeated formats, Sealed targets, and mismatched or absent metas', () => {
  for (const invalid of [
    { ...request, fromDate: '2026-02-30' },
    { ...request, targets: [] },
    { ...request, targets: [request.targets[0], request.targets[0]] },
    { ...request, targets: [{ formatId: 3, metaId: 22 }] },
  ])
    expect(zPQMetaReassignmentRequest.safeParse(invalid).success).toBe(false);
  for (const metaId of [20, 23, 999])
    expect(() =>
      buildPQMetaReassignmentPlan({ ...request, targets: [{ formatId: 1, metaId }] }, fixture()),
    ).toThrow('match its format');
});

test('blocks weeks spanning the cutoff, mixed formats, or non-PQ events', () => {
  for (const extra of [
    fixture().tournaments[2]!,
    fixture().tournaments[3]!,
    { ...fixture().tournaments[0]!, id: 'other', type: 'sq' },
  ]) {
    const snapshot = fixture();
    snapshot.members.push({ groupId: 'group', tournament: extra });
    const { preview } = buildPQMetaReassignmentPlan(request, snapshot);
    expect(preview.conflicts).toHaveLength(1);
    expect(preview.groups).toHaveLength(0);
    expect(preview.weekendGroups).toHaveLength(0);
  }
});

test('blocks links to historical weekends and repairs stale weekend overrides independently', () => {
  const snapshot = fixture();
  snapshot.weekendGroups[0]!.date = '2026-11-21';
  expect(buildPQMetaReassignmentPlan(request, snapshot).preview.conflicts).toHaveLength(1);
  snapshot.weekendGroups[0]!.date = '2026-11-28';
  snapshot.groups[0]!.metaId = 22;
  const preview = buildPQMetaReassignmentPlan(request, snapshot).preview;
  expect(preview.groups).toHaveLength(0);
  expect(preview.weekendGroups).toHaveLength(1);
});

test('preview token is order-independent and detects membership, targets, import and timestamp changes', () => {
  const snapshot = fixture();
  const token = buildPQMetaReassignmentPlan(request, snapshot).preview.previewToken;
  expect(
    buildPQMetaReassignmentPlan(
      { ...request, targets: [...request.targets].reverse() },
      {
        ...snapshot,
        tournaments: [...snapshot.tournaments].reverse(),
        metas: [...snapshot.metas].reverse(),
        groups: [...snapshot.groups].reverse(),
        members: [...snapshot.members].reverse(),
      },
    ).preview.previewToken,
  ).toBe(token);
  for (const mutate of [
    (s: PQMetaSnapshot) => {
      s.tournaments[0]!.updatedAt = '2026-11-01 00:00:00.000002';
    },
    (s: PQMetaSnapshot) => {
      s.tournaments[0]!.imported = false;
    },
    (s: PQMetaSnapshot) => {
      s.members.push({ groupId: 'group', tournament: s.tournaments[4]! });
    },
    (s: PQMetaSnapshot) => {
      s.weekendGroups[0]!.metaId = 22;
    },
    (s: PQMetaSnapshot) => {
      s.metas.find(m => m.id === 22)!.name = 'Renamed target';
    },
  ]) {
    const changed = fixture();
    mutate(changed);
    expect(buildPQMetaReassignmentPlan(request, changed).preview.previewToken).not.toBe(token);
  }
});

test('omitted formats remain unchanged and a fully reassigned snapshot is a no-op', () => {
  const snapshot = fixture();
  const single = buildPQMetaReassignmentPlan(
    { ...request, targets: [request.targets[0]!] },
    snapshot,
  );
  expect(single.preview.tournaments.map(t => t.id)).toEqual(['premier']);
  snapshot.tournaments[0]!.meta = 22;
  snapshot.tournaments[1]!.meta = 23;
  snapshot.groups[0]!.metaId = 22;
  snapshot.weekendGroups[0]!.metaId = 22;
  const { preview, statisticsMetaIds } = buildPQMetaReassignmentPlan(request, snapshot);
  expect(preview.tournaments.length + preview.groups.length + preview.weekendGroups.length).toBe(0);
  expect(statisticsMetaIds).toEqual([]);
});

test('blocks duplicate week names in the target meta, including empty destinations and two source groups', () => {
  const snapshot = fixture();
  const token = buildPQMetaReassignmentPlan(request, snapshot).preview.previewToken;
  snapshot.groups.push({ id: 'destination', name: 'PQ Week 4', metaId: 22 });
  const duplicate = buildPQMetaReassignmentPlan(request, snapshot).preview;
  expect(duplicate.conflicts).toHaveLength(1);
  expect(duplicate.conflicts[0]!.message).toContain('duplicate week groups');
  expect(duplicate.previewToken).not.toBe(token);
  snapshot.groups.at(-1)!.metaId = 19;
  snapshot.members.push({ groupId: 'destination', tournament: snapshot.tournaments[4]! });
  expect(buildPQMetaReassignmentPlan(request, snapshot).preview.conflicts).toHaveLength(2);
  snapshot.members.at(-1)!.tournament = snapshot.tournaments[1]!;
  // Premier and Eternal can each keep a Week 4 in their own target meta.
  expect(buildPQMetaReassignmentPlan(request, snapshot).preview.conflicts).toHaveLength(0);
});
