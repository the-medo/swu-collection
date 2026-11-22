import { BracketInfo } from '../../../types/enums.ts';

/** Infer the cut from the full tournament schedule, including unstarted rounds. */
export function detectMeleeBracketInfo(
  rounds: readonly { name: string }[],
): BracketInfo | undefined {
  const sizes = rounds.map(({ name }) => {
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '');
    if (/^octofinals?$/.test(normalized)) return 16;
    if (/^quarterfinals?$/.test(normalized)) return 8;
    if (/^semifinals?$/.test(normalized)) return 4;
    const explicitSize = normalized.match(/^(?:top|roundof)(\d+)$/);
    return explicitSize ? Number(explicitSize[1]) : 0;
  });

  switch (Math.max(0, ...sizes)) {
    case 16:
      return BracketInfo.TOP16;
    case 8:
      return BracketInfo.TOP8;
    case 4:
      return BracketInfo.TOP4;
    default:
      // Swiss-only, finals-only, missing, or unsupported cuts are inconclusive.
      // Preserve the configured value instead of guessing from attendance.
      return undefined;
  }
}
