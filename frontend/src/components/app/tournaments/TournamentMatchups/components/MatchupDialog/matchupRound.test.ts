import { describe, expect, test } from 'bun:test';
import { getSwissRoundCount, getTopCutRoundLabel, isTopCutRound } from './matchupRound.ts';

describe('matchup top-cut rounds', () => {
  test('labels the last three rounds of a Top 8 tournament', () => {
    expect(getTopCutRoundLabel('top8', 7, 9)).toBe('Quarterfinals');
    expect(getTopCutRoundLabel('top8', 8, 9)).toBe('Semifinals');
    expect(getTopCutRoundLabel('top8', 9, 9)).toBe('Finals');
    expect(isTopCutRound('top8', 6, 9)).toBe(false);
    expect(getSwissRoundCount('top8', 9)).toBe(6);
  });

  test('does not invent quarterfinals for a Top 4 tournament', () => {
    expect(getTopCutRoundLabel('top4', 3, 5)).toBeUndefined();
    expect(getTopCutRoundLabel('top4', 4, 5)).toBe('Semifinals');
    expect(getTopCutRoundLabel('top4', 5, 5)).toBe('Finals');
    expect(getSwissRoundCount('top4', 5)).toBe(3);
  });

  test('includes round of 16 when the tournament declares a Top 16 cut', () => {
    expect(getTopCutRoundLabel('top16', 6, 9)).toBe('Round of 16');
  });

  test('does not classify rounds when the tournament has no top cut', () => {
    expect(getTopCutRoundLabel('none', 5, 5)).toBeUndefined();
    expect(isTopCutRound(undefined, 5, 5)).toBe(false);
    expect(getSwissRoundCount('none', 5)).toBe(5);
    expect(getSwissRoundCount(undefined, 5)).toBe(5);
  });
});
