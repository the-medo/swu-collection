import { BracketInfo } from '../../../../../../../../types/enums.ts';

const topCutRoundLabels: Partial<Record<BracketInfo, readonly string[]>> = {
  [BracketInfo.TOP4]: ['Finals', 'Semifinals'],
  [BracketInfo.TOP8]: ['Finals', 'Semifinals', 'Quarterfinals'],
  [BracketInfo.TOP16]: ['Finals', 'Semifinals', 'Quarterfinals', 'Round of 16'],
};

export const getSwissRoundCount = (
  bracketInfo: string | undefined,
  totalRounds: number | undefined,
) => {
  if (totalRounds === undefined) return undefined;

  const topCutRoundCount = topCutRoundLabels[bracketInfo as BracketInfo]?.length ?? 0;
  return Math.max(0, totalRounds - topCutRoundCount);
};

export const getTopCutRoundLabel = (
  bracketInfo: string | undefined,
  round: number,
  totalRounds: number | undefined,
) => {
  if (totalRounds === undefined) return undefined;

  const labels = topCutRoundLabels[bracketInfo as BracketInfo];
  const roundsBeforeFinals = totalRounds - round;

  if (!labels || roundsBeforeFinals < 0 || roundsBeforeFinals >= labels.length) return undefined;

  return labels[roundsBeforeFinals];
};

export const isTopCutRound = (
  bracketInfo: string | undefined,
  round: number,
  totalRounds: number | undefined,
) => getTopCutRoundLabel(bracketInfo, round, totalRounds) !== undefined;
