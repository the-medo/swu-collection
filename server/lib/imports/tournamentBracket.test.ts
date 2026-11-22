import { afterEach, expect, test } from 'bun:test';
import { detectMeleeBracketInfo } from './tournamentBracket.ts';
import { fetchTournamentView } from './tournamentImportLib.ts';

const rounds = (...names: string[]) => names.map(name => ({ name }));

test('detects the largest elimination round regardless of Swiss rounds or ordering', () => {
  expect(detectMeleeBracketInfo(rounds('Round 1', 'Round 2', 'Semifinals', 'Finals'))).toBe('top4');
  expect(detectMeleeBracketInfo(rounds('Finals', 'Semifinals', 'Round 8', 'Quarterfinals'))).toBe(
    'top8',
  );
  expect(
    detectMeleeBracketInfo(rounds('Round of 16', 'Quarterfinals', 'Semifinals', 'Finals')),
  ).toBe('top16');
});

test('handles capitalization, whitespace, singular labels and explicit cut names', () => {
  for (const name of [' Semifinals ', 'SEMI-FINAL', 'Semi Finals', 'Top 4', 'Round of 4']) {
    expect(detectMeleeBracketInfo(rounds(name, 'Finals'))).toBe('top4');
  }
  for (const name of ['Quarter Final', 'Quarter-finals', 'Top 8', 'Round of 8']) {
    expect(detectMeleeBracketInfo(rounds(name, 'Semifinals'))).toBe('top8');
  }
  for (const name of ['Octofinals', 'Top 16', 'Top16', 'Round of 16']) {
    expect(detectMeleeBracketInfo(rounds(name, 'Quarterfinals'))).toBe('top16');
  }
});

test('does not guess when the schedule is missing, Swiss-only, or unsupported', () => {
  for (const schedule of [
    [],
    rounds('Round 1', 'Round 4', 'Round 8', 'Round 16'),
    rounds('Finals'),
    rounds('Final standings', 'Semifinals playoff recap'),
    rounds('Top 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals'),
  ]) {
    expect(detectMeleeBracketInfo(schedule)).toBeUndefined();
  }
});

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('uses planned cut rounds from pairings even when standings only contain Swiss rounds', async () => {
  globalThis.fetch = (async () =>
    new Response(`
      <div id="standings-round-selector-container">
        <button class="round-selector" data-id="101" data-name="Round 1" data-is-completed="true"></button>
      </div>
      <div id="pairings-round-selector-container">
        <button class="round-selector" data-id="101" data-name="Round 1" data-is-started="true"></button>
        <button class="round-selector" data-id="102" data-name="Semifinals" data-is-started="false"></button>
        <button class="round-selector" data-id="103" data-name="Finals" data-is-started="false"></button>
      </div>
    `)) as unknown as typeof fetch;

  const view = await fetchTournamentView('fixture');
  expect(view?.rounds).toHaveLength(3);
  expect(view?.rounds[1]).toMatchObject({ name: 'Semifinals', started: false });
  expect(detectMeleeBracketInfo(view?.rounds ?? [])).toBe('top4');
});
