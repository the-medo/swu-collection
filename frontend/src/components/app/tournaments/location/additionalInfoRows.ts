import {
  zTournamentAdditionalInfo,
  type TournamentAdditionalInfo,
} from '../../../../../../types/TournamentLocation.ts';

export interface InfoRow {
  id: string;
  key: string;
  value: string;
  mode: 'text' | 'json';
}

export function infoToRows(info: TournamentAdditionalInfo): InfoRow[] {
  return Object.entries(info).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    mode: typeof value === 'string' ? 'text' : 'json',
    value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
  }));
}

export function rowsToInfo(rows: InfoRow[]): TournamentAdditionalInfo {
  const entries: [string, unknown][] = [];
  const keys = new Set<string>();
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) throw new Error('Every field needs a key. Remove unused rows.');
    if (['__proto__', 'constructor', 'prototype'].includes(key))
      throw new Error(`Unsupported key: ${key}`);
    if (keys.has(key)) throw new Error(`Duplicate key: ${key}`);
    keys.add(key);
    let value: unknown = row.value;
    if (row.mode === 'json') {
      try {
        value = JSON.parse(row.value);
      } catch {
        throw new Error(`Invalid JSON for ${key}. Use Text for plain text values.`);
      }
    }
    entries.push([key, value]);
  }
  const parsed = zTournamentAdditionalInfo.safeParse(Object.fromEntries(entries));
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || 'Invalid additional info.');
  return parsed.data;
}
