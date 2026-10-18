import { getBaseKey } from '../../../../../../shared/lib/basicBases.ts';

export const isKnownSnapshotDeckKey = (key: string) =>
  !['', 'unknown', 'Unknown', 'others', 'Others'].includes(key);

export const getSnapshotDeckKey = (
  leaderCardId: string,
  baseCardId: string,
  view: 'leaders' | 'leadersAndBase',
): string => {
  if (leaderCardId === 'others' || leaderCardId === 'Others') return 'Others';
  if (!isKnownSnapshotDeckKey(leaderCardId)) return 'unknown';
  if (view === 'leaders') return leaderCardId;
  if (!isKnownSnapshotDeckKey(baseCardId)) return 'unknown';
  return `${leaderCardId}|${getBaseKey(baseCardId)}`;
};
