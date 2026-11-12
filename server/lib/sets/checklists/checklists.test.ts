import { expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { cardList } from '../../../db/lists.ts';
import { SwuSet } from '../../../../types/enums.ts';
import { getChecklistCards } from './rows.ts';
import { getChecklistDocuments, getChecklistLogo } from './pdf.ts';

test('all three layouts include each physical finish in both paper sizes', () => {
  // Hunting Nexu has legacy duplicate IDs for both Standard and Hyperspace.
  const cards = getChecklistCards({ nexu: cardList['hunting-nexu'] }, SwuSet.SHD);
  expect(cards).toHaveLength(1);
  expect(cards[0].printings.map(p => [p.number, p.treatment])).toEqual([
    [168, 'Standard'],
    [168, 'Standard Foil'],
    [437, 'Hyperspace'],
    [437, 'Hyperspace Foil'],
  ]);
  const docs = getChecklistDocuments(SwuSet.SHD, cards, null);
  expect(new Set(docs.map(doc => doc.filename)).size).toBe(6);
  for (const layout of ['Card grid', 'Printing list', 'Printings by card']) {
    expect(docs.filter(doc => doc.layout === layout).map(doc => doc.paper)).toEqual([
      'A4',
      'Letter',
    ]);
  }
  for (const doc of docs) {
    const { document } = parseHTML(doc.html);
    expect(document.querySelectorAll('i')).toHaveLength(4);
    if (doc.layout === 'Card grid') {
      expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
      expect(document.querySelector('tbody tr')?.textContent).toContain('Hunting Nexu');
    } else if (doc.layout === 'Printing list') {
      expect(document.querySelectorAll('li')).toHaveLength(4);
    } else {
      const groups = document.querySelectorAll('article');
      expect(groups).toHaveLength(1);
      expect(groups[0].querySelector('h2')?.textContent).toBe('Hunting Nexu');
      expect([...groups[0].querySelectorAll('.variant')].map(mark => mark.textContent)).toEqual([
        '168 Standard',
        '168 Standard Foil',
        '437 Hyperspace',
        '437 Hyperspace Foil',
      ]);
    }
  }
});

test('set membership follows reprints, includes weekly promos, and distinguishes foil-only Hyperspace', () => {
  const cards = getChecklistCards(cardList, SwuSet.HMW);
  const byName = new Map(cards.map(card => [card.name, card]));
  const reprinted = Object.values(cardList).find(
    card =>
      card &&
      card.set !== SwuSet.HMW &&
      Object.values(card.variants).some(v => v?.set === SwuSet.HMW && v.variantName === 'Standard'),
  )!;
  expect(byName.get(reprinted.name)?.first.set).toBe(SwuSet.HMW);
  const printings = cards.flatMap(card => card.printings);
  expect(printings.some(p => String(p.set) === 'hmwp' && p.treatment === 'Weekly Play Foil')).toBe(
    true,
  );
  const foilOnly = Object.values(cardList)
    .flatMap(card => Object.values(card?.variants ?? {}))
    .find(
      v => v?.set === SwuSet.HMW && v.variantName === 'Hyperspace' && v.hasFoil && !v.hasNonfoil,
    )!;
  const matching = printings.filter(p => p.set === foilOnly.set && p.number === foilOnly.cardNo);
  expect(matching.map(p => p.treatment)).toContain('Hyperspace Foil');
  expect(matching.map(p => p.treatment)).not.toContain('Hyperspace');
});

test('token numbers form a separate sequence after the numbered cards in every layout', () => {
  const cards = getChecklistCards(
    {
      regular: cardList['director-krennic--aspiring-to-authority'],
      token: cardList['experience'],
    },
    SwuSet.SOR,
  );
  expect(cards.map(card => [card.first.number, card.first.token])).toEqual([
    [1, false],
    [1, true],
  ]);
  for (const doc of getChecklistDocuments(SwuSet.SOR, cards, null)) {
    const { document } = parseHTML(doc.html);
    const rows = [...document.querySelectorAll('tbody tr, li, article')];
    const tokenIndex = rows.findIndex(row => row.textContent?.includes('Token 001'));
    expect(tokenIndex).toBeGreaterThan(0);
    expect(rows.slice(tokenIndex).every(row => row.textContent?.includes('Experience'))).toBe(true);
  }
});

test('all editions embed the artwork for each catalog set', async () => {
  for (const set of Object.values(SwuSet)) {
    const logo = await getChecklistLogo(set);
    expect(logo?.toString('ascii', 1, 4)).toBe('PNG');
    for (const doc of getChecklistDocuments(set, [], logo)) {
      expect(doc.html).toContain(`url("data:image/png;base64,${logo!.toString('base64')}")`);
    }
  }
});
