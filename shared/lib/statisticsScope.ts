export type StatisticsScope = 'standard' | 'practice';

/** Legacy cached Crossfire rows predate statisticsScope. Fail closed for any
 * resumed result, including while a cache receives its migrated server row. */
export function isPracticeResult(game: {
  statisticsScope?: string;
  gameSource: string;
  otherData?: { crossfire?: { resumed?: boolean } };
}): boolean {
  return (
    game.statisticsScope === 'practice' ||
    (game.gameSource === 'crossfire' && game.otherData?.crossfire?.resumed === true)
  );
}
