import { expect, test } from 'bun:test';
import { cardList } from '../../db/lists.ts';
import { resolveCollectionImport } from './resolveCollectionImport.ts';
import { parseCollectionCsv } from './parseCollectionCsv.ts';
import { collectionImportSwudbUrl } from '../../../types/CollectionImport.ts';
import { createPreviewCardPayloadTemplate } from '../cards/previewCardPayload.ts';
import { mergeCardLists } from '../cards/cardListProvider.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../types/enums.ts';

const header = 'Set,CardNumber,Count,IsFoil,Stamp';

test('excludes every duplicate row while retaining unique rows and original quantities', () => {
  const { rows } = resolveCollectionImport(
    `${header}\nHMW,313,2,False,\nHMW,313,1,False,\nSOR,001,1,False,`,
    cardList,
  );
  expect(rows.map(row => row.problem)).toEqual(['duplicate', 'duplicate', undefined]);
  expect(rows[0].relatedRows).toEqual([3]);
  expect(rows[1].relatedRows).toEqual([2]);
  expect(rows[0].values).toEqual(['HMW', '313', '2', 'False', '']);
});

test('duplicates are resolved across aliases and foil numbering before batching', () => {
  const { rows } = resolveCollectionImport(
    `${header}\nJTLP,16,1,True,\nJTLW,36,2,True,\nJTLP,16,1,False,`,
    cardList,
  );
  expect(rows.map(row => row.problem)).toEqual(['duplicate', 'duplicate', undefined]);
  expect(rows[0].match?.variantId).toEqual(rows[1].match?.variantId);
});

test('requires review for suffixed numbers without treating them as numeric catalog printings', () => {
  const { headers, rows } = resolveCollectionImport(
    `${header}\nSEC,571,3,True,\nSEC,571m,1,True,\nSEC,817m,1,True,\nSEC,571x,1,True,`,
    cardList,
  );
  expect(rows.map(row => row.problem)).toEqual([undefined, 'unmatched', 'unmatched', 'unmatched']);
  expect(rows[0].match?.cardId).toBe('willrow-hood--on-the-run');
  expect(rows.slice(1).every(row => row.match === null)).toBe(true);
  expect(rows[1].values[1]).toBe('571m');
  expect(rows[1].raw).toBe('SEC,571m,1,True,');
  expect(rows[1].message).toContain('suffix');
  expect(collectionImportSwudbUrl(headers, rows[1].values)).toBe('https://swudb.com/card/SEC/571m');
  expect(rows[2].values[1]).toBe('817m');
  expect(rows[3].values[1]).toBe('571x');
});

test('matches weekly-play aliases and year promos without losing foil identity', () => {
  const { rows } = resolveCollectionImport(
    `${header}\nHMWP,16,1,False,\nHMWP,36,1,True,\nLOFP,8,1,False,\nSECP,7,1,False,\nP25,108,1,True,\nP26,204,3,False,`,
    cardList,
  );
  expect(rows.every(row => row.match && !row.problem)).toBe(true);
  expect(rows[0].match?.cardName).toBe('Tribubble Bongo Sub');
  expect(rows[1].match?.variantName).toBe('Weekly Play Foil');
  expect(rows[4].match?.cardName).toBe("Darth Maul's Lightsaber");
});

test('resolves foil numbering for every set from JTL onwards, including upcoming sets', () => {
  for (const set of Object.values(SwuSet).filter(
    set => setInfo[set].sortValue >= setInfo[SwuSet.JTL].sortValue,
  )) {
    const template = createPreviewCardPayloadTemplate();
    const standard = Object.values(template.variants)[0]!;
    const card = {
      ...template,
      set,
      variants: {
        standard: { ...standard, variantId: 'standard', set, cardNo: 1 },
        foil: {
          ...standard,
          variantId: 'foil',
          set,
          cardNo: 301,
          variantName: 'Standard Foil',
          hasFoil: true,
          hasNonfoil: false,
        },
      },
    };
    const { rows } = resolveCollectionImport(
      `${header}\n${set},1,1,True,\n${set},301,1,True,\n${set},1,1,False,`,
      { [card.cardId]: card },
    );
    expect(rows.map(row => row.problem)).toEqual(['duplicate', 'duplicate', undefined]);
    expect(rows.map(row => row.match?.variantId)).toEqual(['foil', 'foil', 'standard']);
  }
});

test('imports active previews from the merged catalog and excludes duplicated preview rows', () => {
  const template = createPreviewCardPayloadTemplate();
  const variant = Object.values(template.variants)[0]!;
  const preview = {
    ...template,
    cardId: 'collection-import-preview',
    variants: { [variant.variantId]: { ...variant, cardNo: 9999 } },
  };
  const merged = mergeCardLists(cardList, { [preview.cardId]: preview });
  const row = `${preview.set},9999,1,False,`;
  const unique = resolveCollectionImport(`${header}\n${row}\nSOR,001,1,False,`, merged).rows;
  expect(unique.every(row => !row.problem)).toBe(true);
  expect(unique[0].match?.cardId).toBe(preview.cardId);
  expect(
    resolveCollectionImport(`${header}\n${row}\n${row}`, merged).rows.map(r => r.problem),
  ).toEqual(['duplicate', 'duplicate']);
  expect(resolveCollectionImport(`${header}\n${row}`, cardList).rows[0].problem).toBe('unmatched');
});

test('prefers main-set standard numbers over older promos and reports true catalog ambiguity', () => {
  const { rows } = resolveCollectionImport(
    `${header}\nTWI,001,1,False,\nSHD,057,1,False,`,
    cardList,
  );
  expect(rows[0].match?.cardId).toBe('nala-se--clone-engineer');
  expect(rows[0].problem).toBeUndefined();
  expect(rows[1].problem).toBe('ambiguous');
});

test('preserves every field, quotes, newlines, stamps and malformed rows for review', () => {
  const csv =
    '\uFEFF' +
    header +
    ',Note\r\nUNKNOWN,0007m,2,True,Judge,"Hello, ""friend""\r\nnext line"\r\nSHDPR,001,1,True,Judge,note\r\nSOR,001,0,False,,note\r\nSOR,002,1,False,,note,extra\r\n';
  const { headers, rows } = resolveCollectionImport(csv, cardList);
  expect(rows.map(row => row.rowNumber)).toEqual([2, 4, 5, 6]);
  expect(rows[0].values).toEqual([
    'UNKNOWN',
    '0007m',
    '2',
    'True',
    'Judge',
    'Hello, "friend"\r\nnext line',
  ]);
  expect(rows[0].raw).toContain('""friend""');
  expect(rows[1].problem).toBe('unmatched');
  expect(rows[2].problem).toBe('invalid');
  expect(rows[3].problem).toBe('invalid');
  expect(headers.at(-1)).toBe('Column 7');
  expect(collectionImportSwudbUrl(headers, rows[0].values)).toBe(
    'https://swudb.com/card/UNKNOWN/0007m',
  );
  expect(collectionImportSwudbUrl(headers, ['javascript:foo', '1'])).toBeUndefined();
});

test('reports all-unmatched files and rejects empty or duplicate-header files', () => {
  expect(resolveCollectionImport(`${header}\nUNKNOWN,1,1,False,`, cardList).rows[0].problem).toBe(
    'unmatched',
  );
  expect(() => parseCollectionCsv(header)).toThrow('no card rows');
  expect(() => parseCollectionCsv(`${header},Set\nSOR,1,1,False,,SOR`)).toThrow('duplicate names');
});

test('large duplicate groups are excluded across batch boundaries without quadratic reports', () => {
  const { rows } = resolveCollectionImport(
    `${header}\n${Array(2100).fill('HMW,313,1,False,').join('\n')}`,
    cardList,
  );
  expect(rows).toHaveLength(2100);
  expect(rows.every(row => row.problem === 'duplicate')).toBe(true);
  expect(rows.every(row => row.relatedRows.length === 20)).toBe(true);
});
