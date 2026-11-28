import { createHash } from 'node:crypto';
import type {
  PQMetaChange,
  PQMetaReassignmentPreview,
  PQMetaReassignmentRequest,
} from '../../../types/PQMetaReassignment.ts';

export class PQMetaReassignmentError extends Error {
  constructor(
    message: string,
    public status: 400 | 409,
  ) {
    super(message);
  }
}

export interface PQMetaSnapshot {
  metas: { id: number; name: string; format: number; date: string; set: string }[];
  tournaments: {
    id: string;
    name: string;
    type: string;
    format: number;
    meta: number | null;
    date: string;
    imported: boolean;
    updatedAt: string;
  }[];
  groups: { id: string; name: string; metaId: number | null }[];
  members: { groupId: string; tournament: PQMetaSnapshot['tournaments'][number] }[];
  weekendGroups: {
    tournamentGroupId: string;
    tournamentWeekendId: string;
    formatId: number | null;
    metaId: number | null;
    date: string;
    name: string;
  }[];
}

export function buildPQMetaReassignmentPlan(
  request: PQMetaReassignmentRequest,
  snapshot: PQMetaSnapshot,
) {
  const targets = [...request.targets].sort((a, b) => a.formatId - b.formatId);
  const metas = new Map(snapshot.metas.map(meta => [meta.id, meta]));
  for (const target of targets) {
    if (metas.get(target.metaId)?.format !== target.formatId)
      throw new PQMetaReassignmentError('Each target meta must exist and match its format.', 400);
  }
  const targetByFormat = new Map<number, number>(targets.map(t => [t.formatId, t.metaId]));
  const eligible = (t: PQMetaSnapshot['tournaments'][number]) =>
    t.type === 'pq' && t.date >= request.fromDate && targetByFormat.has(t.format);
  const change = (
    id: string,
    name: string,
    formatId: number,
    fromMetaId: number | null,
  ): PQMetaChange => {
    const toMetaId = targetByFormat.get(formatId)!;
    return {
      id,
      name,
      formatId,
      fromMetaId,
      fromMetaName: metas.get(fromMetaId!)?.name ?? null,
      toMetaId,
      toMetaName: metas.get(toMetaId)!.name,
    };
  };
  const candidates = snapshot.tournaments.filter(eligible).sort((a, b) => a.id.localeCompare(b.id));
  const tournaments = candidates
    .filter(t => t.meta !== targetByFormat.get(t.format))
    .map(t => ({
      ...change(t.id, t.name, t.format, t.meta),
      date: t.date,
      imported: t.imported,
    }));
  const groups: PQMetaReassignmentPreview['groups'] = [];
  const weekendGroups: PQMetaReassignmentPreview['weekendGroups'] = [];
  const conflicts: PQMetaReassignmentPreview['conflicts'] = [];
  const relevantGroups: PQMetaSnapshot['groups'] = [];
  const projectedMetas = new Map(snapshot.groups.map(group => [group.id, group.metaId]));
  const eligibleGroups: PQMetaSnapshot['groups'] = [];
  for (const group of [...snapshot.groups].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!group.name.startsWith('PQ Week ')) continue;
    const members = snapshot.members.filter(m => m.groupId === group.id).map(m => m.tournament);
    if (!members.some(eligible)) continue;
    relevantGroups.push(group);
    const format = members[0]!.format;
    if (!members.every(t => eligible(t) && t.format === format)) {
      conflicts.push({
        groupId: group.id,
        name: group.name,
        message:
          'Contains tournaments before the cutoff, another format, or non-PQ events. Split or correct this group first.',
      });
      continue;
    }
    const dates = members.map(t => t.date).sort();
    projectedMetas.set(group.id, targetByFormat.get(format)!);
    eligibleGroups.push(group);
    if (group.metaId !== targetByFormat.get(format))
      groups.push({
        ...change(group.id, group.name, format, group.metaId),
        fromDate: dates[0]!,
        toDate: dates.at(-1)!,
        tournamentCount: members.length,
      });
    for (const link of snapshot.weekendGroups.filter(l => l.tournamentGroupId === group.id)) {
      if (link.date < request.fromDate) {
        conflicts.push({
          groupId: group.id,
          name: group.name,
          message: 'Attached to a weekend before the cutoff. Correct the weekend attachment first.',
        });
        continue;
      }
      if (link.metaId !== targetByFormat.get(format) || link.formatId !== format)
        weekendGroups.push({
          ...change(group.id, group.name, format, link.metaId),
          weekendId: link.tournamentWeekendId,
          weekendName: link.name,
          date: link.date,
        });
    }
  }
  // Check the final placement of every group, including empty destination
  // groups and multiple source groups moving into the same target meta.
  for (const group of eligibleGroups) {
    const destination = projectedMetas.get(group.id);
    if (
      snapshot.groups.some(
        other =>
          other.id !== group.id &&
          other.name === group.name &&
          projectedMetas.get(other.id) === destination,
      )
    ) {
      conflicts.push({
        groupId: group.id,
        name: group.name,
        message: `Another group named ${group.name} would exist in ${metas.get(destination!)?.name ?? 'the target meta'}. Resolve the duplicate week groups first.`,
      });
    }
  }
  weekendGroups.sort((a, b) => a.weekendId.localeCompare(b.weekendId) || a.id.localeCompare(b.id));
  const groupIds = new Set(relevantGroups.map(g => g.id));
  const relevantMembers = snapshot.members
    .filter(m => groupIds.has(m.groupId))
    .sort(
      (a, b) =>
        a.groupId.localeCompare(b.groupId) || a.tournament.id.localeCompare(b.tournament.id),
    );
  const relevantLinks = snapshot.weekendGroups
    .filter(l => groupIds.has(l.tournamentGroupId))
    .sort(
      (a, b) =>
        a.tournamentGroupId.localeCompare(b.tournamentGroupId) ||
        a.tournamentWeekendId.localeCompare(b.tournamentWeekendId),
    );
  const metaIds = new Set([
    ...targets.map(t => t.metaId),
    ...candidates.map(t => t.meta),
    ...relevantGroups.map(g => g.metaId),
    ...relevantLinks.map(l => l.metaId),
  ]);
  const targetMetaIds = new Set(targets.map(target => target.metaId));
  const checkedGroups = snapshot.groups
    .filter(group => groupIds.has(group.id) || targetMetaIds.has(group.metaId!))
    .sort((a, b) => a.id.localeCompare(b.id));
  const previewToken = createHash('sha256')
    .update(
      JSON.stringify({
        request: { fromDate: request.fromDate, targets },
        candidates,
        groups: checkedGroups,
        members: relevantMembers,
        links: relevantLinks,
        metas: snapshot.metas.filter(m => metaIds.has(m.id)).sort((a, b) => a.id - b.id),
      }),
    )
    .digest('hex');
  const preview: PQMetaReassignmentPreview = {
    previewToken,
    tournaments,
    groups,
    weekendGroups,
    conflicts,
    formats: targets.map(target => ({
      formatId: target.formatId,
      metaName: metas.get(target.metaId)!.name,
      tournaments: tournaments.filter(t => t.formatId === target.formatId).length,
      alreadyAssigned: candidates.filter(
        t => t.format === target.formatId && t.meta === target.metaId,
      ).length,
      groups: groups.filter(g => g.formatId === target.formatId).length,
      weekendGroups: weekendGroups.filter(g => g.formatId === target.formatId).length,
    })),
    sealedCount: snapshot.tournaments.filter(
      t => t.type === 'pq' && t.format === 3 && t.date >= request.fromDate,
    ).length,
  };
  const statisticsMetaIds = [
    ...new Set(
      tournaments
        .filter(t => t.imported)
        .flatMap(t => [t.fromMetaId, t.toMetaId])
        .filter((id): id is number => id !== null),
    ),
  ];
  return { preview, statisticsMetaIds };
}
