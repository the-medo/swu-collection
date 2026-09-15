import { describe, expect, it } from 'bun:test';
import { moveHandCard, reconcileHand } from './handOrder.ts';

describe('local hand ordering', () => {
  it('preserves reordered exact copies, removes departed cards and appends arrivals', () => {
    expect(reconcileHand(['copy-b', 'copy-a', 'played'], ['copy-a', 'copy-b', 'drawn'])).toEqual([
      'copy-b',
      'copy-a',
      'drawn',
    ]);
  });
  it('moves in either direction without replacing an identical printed card', () => {
    const original = ['copy-a', 'copy-b', 'other'];
    expect(moveHandCard(original, 'copy-a', 'other')).toEqual(['copy-b', 'other', 'copy-a']);
    expect(moveHandCard(original, 'other', 'copy-a')).toEqual(['other', 'copy-a', 'copy-b']);
    expect(original).toEqual(['copy-a', 'copy-b', 'other']);
  });
  it('ignores a stale drag and forgets departed positions', () => {
    expect(moveHandCard(['a', 'b'], 'gone', 'b')).toEqual(['a', 'b']);
    expect(reconcileHand(reconcileHand(['b', 'a'], ['a']), ['a', 'b'])).toEqual(['a', 'b']);
  });
});
