import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
  CardVariant,
} from '../../../lib/swu-resources/types.ts';
import type {
  CollectionImportMatch,
  CollectionImportProblem,
} from '../../../types/CollectionImport.ts';
import { parseCollectionCsv, type CollectionCsvRow } from './parseCollectionCsv.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../types/enums.ts';

type Candidate = { card: CardDataWithVariants<CardListVariants>; variant: CardVariant };
export type ResolvedImportRow = CollectionCsvRow & {
  problem?: CollectionImportProblem;
  message: string;
  relatedRows: number[];
  match: CollectionImportMatch | null;
};

const promoAliases: Record<string, string> = { jtlw: 'jtlp', lofw: 'lofp', secw: 'secp' };
const canonicalSet = (set: string) => promoAliases[set] ?? set;
const modernSets = new Set(
  Object.values(setInfo)
    .filter(set => set.sortValue >= setInfo[SwuSet.JTL].sortValue)
    .map(set => set.code),
);
const foilNames: Record<string, string> = {
  Standard: 'Standard Foil',
  Hyperspace: 'Hyperspace Foil',
  'Standard Prestige': 'Foil Prestige',
  'Weekly Play': 'Weekly Play Foil',
  'OP Promo': 'OP Promo Foil',
};

export function resolveCollectionImport(csv: string, cards: CardList) {
  const parsed = parseCollectionCsv(csv);
  const fieldIndex = new Map(parsed.headers.map((h, i) => [h.trim().toLowerCase(), i]));
  const field = (row: CollectionCsvRow, name: string) =>
    row.values[fieldIndex.get(name) ?? -1]?.trim() ?? '';
  const index = new Map<string, Candidate[]>();
  for (const card of Object.values(cards)) {
    if (!card || card.type.includes('Token')) continue;
    for (const variant of Object.values(card.variants)) {
      if (!variant) continue;
      const key = `${canonicalSet(variant.set)}:${variant.cardNo}`;
      const candidates = index.get(key) ?? [];
      candidates.push({ card, variant });
      index.set(key, candidates);
    }
  }

  const rows: ResolvedImportRow[] = parsed.rows.map(row => {
    const result: ResolvedImportRow = { ...row, message: '', relatedRows: [], match: null };
    const fail = (problem: CollectionImportProblem, message: string) => ({
      ...result,
      problem,
      message,
    });
    if (row.error) return fail('invalid', row.error);
    const set = canonicalSet(field(row, 'set').toLowerCase());
    const number = field(row, 'cardnumber');
    const count = field(row, 'count');
    const foil = field(row, 'isfoil').toLowerCase();
    const stamp = field(row, 'stamp').toLowerCase();
    if (!set || !number) return fail('invalid', 'Set and CardNumber are required.');
    if (!/^\d+$/.test(count) || Number(count) < 1 || Number(count) > 1000)
      return fail('invalid', 'Count must be a whole number between 1 and 1000.');
    if (foil !== 'true' && foil !== 'false')
      return fail('invalid', 'IsFoil must be True or False.');
    const isFoil = foil === 'true';
    // Numeric catalog identifiers cannot establish the identity of a suffixed
    // SWUDB printing. Keep every such source row for explicit manual review.
    if (!/^\d+$/.test(number))
      return fail(
        'unmatched',
        'Card numbers with letters or symbols require manual review. The original number, including its suffix, has been preserved.',
      );
    const cardNo = Number(number);
    let candidates = index.get(`${set}:${cardNo}`) ?? [];
    if (set === 'sec' && (cardNo === 571 || cardNo === 817)) {
      // The exact unsuffixed SWUDB entries belong to Willrow Hood.
      candidates = candidates.filter(c => c.card.cardId === 'willrow-hood--on-the-run');
    }
    if (stamp && stamp !== 'serialized')
      return fail('unmatched', `The ${field(row, 'stamp')} stamp requires manual matching.`);
    if (stamp === 'serialized')
      candidates = candidates.filter(c => c.variant.variantName === 'Serialized Prestige');
    // Early sets share foil/nonfoil variant records and have promos at the same numbers.
    if (['sor', 'shd', 'twi'].includes(set)) {
      candidates = candidates.filter(
        c =>
          c.variant.baseSet &&
          ['Standard', 'Hyperspace', 'Showcase'].includes(c.variant.variantName),
      );
      // Some older prerelease hyperspace promos use main-set numbers in our
      // catalog. A main-set CSV number must prefer the standard printing.
      const standard = candidates.filter(c => c.variant.variantName === 'Standard');
      if (standard.length) candidates = standard;
    }
    if (candidates.length === 0)
      return fail('unmatched', 'No matching printing was found in the card catalog.');
    if (candidates.length !== 1)
      return fail(
        'ambiguous',
        'More than one printing matches this set and number. Manual review is required.',
      );
    const { card } = candidates[0];
    let { variant } = candidates[0];
    if (isFoil && foilNames[variant.variantName] && (modernSets.has(set) || set.endsWith('p'))) {
      const foilVariant = Object.values(card.variants).find(
        v => v && canonicalSet(v.set) === set && v.variantName === foilNames[variant.variantName],
      );
      if (foilVariant) variant = foilVariant;
      // Some catalogs store both finishes in one variant. Keep that printing when
      // no separate foil is present, as the existing importer does.
    }
    if (!isFoil && /foil|serialized|showcase/i.test(variant.variantName))
      return fail('invalid', 'IsFoil is False but this number identifies a foil printing.');
    result.match = {
      cardId: card.cardId,
      cardName: card.name,
      variantId: variant.variantId,
      variantName: variant.variantName,
      count: Number(count),
      isFoil,
    };
    return result;
  });

  // Exclude the whole duplicate group before batching; never keep its first row.
  const groups = new Map<string, ResolvedImportRow[]>();
  for (const row of rows) {
    if (!row.match || row.problem) continue;
    const { cardId, variantId, isFoil } = row.match;
    const key = JSON.stringify([cardId, variantId, isFoil]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const lines = group.map(row => row.rowNumber);
    for (const row of group) {
      row.problem = 'duplicate';
      // Bound cross-references: a large group must not produce a quadratic report.
      row.relatedRows = lines
        .slice(0, 21)
        .filter(line => line !== row.rowNumber)
        .slice(0, 20);
      row.message = `${group.length} CSV rows resolve to the same printing and finish. None of these rows were imported.${group.length > 21 ? ' The first 20 related lines are listed.' : ''}`;
    }
  }
  return { headers: parsed.headers, rows };
}
