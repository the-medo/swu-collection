import { CardPriceSourceType } from '../../../types/CardPrices.ts';
import { formatDistanceToNow, isBefore } from 'date-fns';
import { stringOrDateToDate } from '../date/date-utils.ts';

export function getSourceTypeLastUpdate(sourceType: CardPriceSourceType) {
  const now = new Date();

  const buildUtcToday = (hour: number, minute: number) =>
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0),
    );

  let todayCutoffUtc: Date | null = null;

  switch (sourceType) {
    case CardPriceSourceType.CARDMARKET:
    case 'cardmarket':
      todayCutoffUtc = buildUtcToday(4, 2);
      break;
    case CardPriceSourceType.TCGPLAYER:
    case 'tcgplayer':
      todayCutoffUtc = buildUtcToday(21, 2);
      break;
    default:
      // For unknown/other sources, assume "now" to avoid marking outdated
      return now;
  }

  // Ensure result is in the past
  if (now >= todayCutoffUtc) {
    return todayCutoffUtc;
  }

  const prev = new Date(todayCutoffUtc);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return prev;
}

export function outdatedBySourceType(
  sourceType: CardPriceSourceType,
  entityPriceUpdatedAt: string | Date,
) {
  const epUpdatedAt = stringOrDateToDate(entityPriceUpdatedAt);

  const lastUpdate = getSourceTypeLastUpdate(sourceType);
  const isOutdated = isBefore(epUpdatedAt, lastUpdate);
  const entityPriceUpdatedString = formatDistanceToNow(epUpdatedAt, { addSuffix: true });
  return { isOutdated, message: entityPriceUpdatedString };
}

export function outdatedByUpdatedAt(
  entityUpdatedAt: string | Date,
  entityPriceUpdatedAt: string | Date,
) {
  const eUpdatedAt = stringOrDateToDate(entityUpdatedAt);
  const epUpdatedAt = stringOrDateToDate(entityPriceUpdatedAt);

  const isOutdated = isBefore(epUpdatedAt, eUpdatedAt);
  const entityPriceUpdatedString = formatDistanceToNow(epUpdatedAt, { addSuffix: true });
  return { isOutdated, message: entityPriceUpdatedString };
}

export function isEntityPriceOutdated(
  sourceType: CardPriceSourceType,
  entityUpdatedAt?: string | Date | null,
  entityPriceUpdatedAt?: string | Date | null,
) {
  if (!entityPriceUpdatedAt) return [`No information about updates available`];
  const r = outdatedBySourceType(sourceType, entityPriceUpdatedAt);
  if (r.isOutdated) return [`Computed on outdated prices!`, `Prices last updated: ${r.message}`];

  if (!entityUpdatedAt) return [`No information about updates available`];
  const u = outdatedByUpdatedAt(entityUpdatedAt, entityPriceUpdatedAt);
  if (u.isOutdated) return [`Computed on old version!`, `Prices last updated: ${r.message}`];

  return false;
}
