import { describe, expect, test } from 'bun:test';
import { SwuSet } from '../../types/enums.ts';
import { cardsBySetAndNumber, cardsByUid } from './lists.ts';

describe('official card indexes', () => {
  test('keeps numbered Homeworlds cards ahead of overlapping token numbers', () => {
    expect(cardsBySetAndNumber[SwuSet.HMW]?.[2]?.cardId).toBe('maz-kanata--eclectic-pirate-queen');
    expect(cardsBySetAndNumber[SwuSet.HMW]?.[3]?.cardId).toBe(
      'doctor-hemlock--emotion-has-no-place-here',
    );
  });

  test('keeps token UIDs available for official UID resolution', () => {
    expect(cardsByUid['6445363199']?.cardId).toBe('beast');
    expect(cardsByUid['0077073180']?.cardId).toBe('beast');
    expect(cardsByUid['1952492595']?.cardId).toBe('beast');
  });
});
