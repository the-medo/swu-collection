export type LiveTournamentAdditionalData = Record<string, unknown>;

const isRecord = (value: unknown): value is LiveTournamentAdditionalData =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseLiveTournamentAdditionalData(
  value: string | null | undefined,
): LiveTournamentAdditionalData {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function serializeLiveTournamentAdditionalData(
  value: LiveTournamentAdditionalData | null | undefined,
) {
  if (!value || Object.keys(value).length === 0) return null;

  return JSON.stringify(value);
}

export function mergeLiveTournamentAdditionalData(
  current: string | null | undefined,
  next: LiveTournamentAdditionalData | null | undefined,
) {
  return serializeLiveTournamentAdditionalData({
    ...parseLiveTournamentAdditionalData(current),
    ...(next ?? {}),
  });
}
