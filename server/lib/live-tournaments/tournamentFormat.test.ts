import { expect, test } from 'bun:test';
import { tournamentCanImportResults, tournamentExpectsMeleeDecklists } from './tournamentFormat.ts';

test('Sealed and Draft can import results without decklists', () => {
  for (const format of [3, 4]) {
    expect(tournamentExpectsMeleeDecklists({ format })).toBe(false);
    expect(tournamentCanImportResults({ format }, false)).toBe(true);
    expect(tournamentCanImportResults({ format }, true)).toBe(true);
  }
});

test('constructed automatic imports still require supported formats and decklists', () => {
  for (const format of [1, 6]) {
    expect(tournamentCanImportResults({ format }, false)).toBe(false);
    expect(tournamentCanImportResults({ format }, true)).toBe(true);
  }
  for (const format of [2, 5, 7, 8, 999]) {
    expect(tournamentCanImportResults({ format }, true)).toBe(false);
  }
});
