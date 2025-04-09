const topIndex: Record<number, number> = {
  8: 0,
  16: 1,
  32: 2,
  64: 3,
  128: 4,
};

export const transformatorAccordingToAttendance = [
  {
    maxAttendance: 32,
    top: [2, 4, 8, undefined, undefined],
  },
  {
    maxAttendance: 64,
    top: [4, 8, 16, undefined, undefined],
  },
  {
    maxAttendance: 128,
    top: [8, 16, 32, undefined, undefined],
  },
  {
    maxAttendance: 256,
    top: [8, 16, 32, 64, undefined],
  },
  {
    maxAttendance: Infinity,
    top: [8, 16, 32, 64, 128],
  },
];

/**
 * Normally, when somebody wants top 8, we give them top 8...
 * but when stats from multiple events are merged and some events are small, these stats can be very scewed.
 * Taking top 8 from 500+ SQ tournament is different than top 8 from 30 player PQ.
 * Thats why im trying to take tops according to attendance.
 */
export const transformTopPlacementsAccordingToAttendance = (attendance: number, top: number) => {
  const ti = topIndex[top];

  return transformatorAccordingToAttendance.find(t => t.maxAttendance > attendance)?.top[ti];
};
