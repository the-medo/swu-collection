// Helper: derive display type for grouping and filtering
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';
import { CPFilterAspects } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';

export type ExpandedCardData = {
  cardPoolNumber: number;
  location: 'pool' | 'deck' | 'trash';
  card: CardDataWithVariants<CardListVariants>;
  cardId: string;
  variantId: string;
  filterSuccess: boolean;
};

type CardStack = { title: string; cards: ExpandedCardData[] };
export type CardGroup = { title: string; cards: CardStack[] };

export type CPDeckContent = {
  pool: {
    cards: ExpandedCardData[];
    boxes: CardGroup[];
  };
  deck: ExpandedCardData[];
  trash: ExpandedCardData[];
};

export const getDisplayType = (
  card: CardDataWithVariants<CardListVariants>,
): 'Ground' | 'Space' | 'Upgrade' | 'Event' | 'Other' => {
  const t = card.type;
  if (t === 'Upgrade') return 'Upgrade';
  if (t === 'Event') return 'Event';
  if (t === 'Unit') {
    const hasGround = !!card.arenaMap?.Ground;
    const hasSpace = !!card.arenaMap?.Space;
    if (hasGround && !hasSpace) return 'Ground';
    if (!hasGround && hasSpace) return 'Space';
    // If both or none specified, default to Ground for grouping consistency
    return 'Ground';
  }
  return 'Other';
};

// 1) Filters
export const aspectFilter = (
  card: CardDataWithVariants<CardListVariants>,
  aspectSetting: CPFilterAspects,
  exact: boolean,
  leaderBaseAspects: readonly any[],
) => {
  if (aspectSetting === 'all') return true;
  const selected: string[] =
    aspectSetting === 'showOnlyLeaderAndBaseAspects'
      ? (leaderBaseAspects as string[])
      : [aspectSetting as unknown as string];
  if (!selected || selected.length === 0) return true; // nothing to filter by

  const cardAspects = card.aspects as unknown as string[];
  if (exact) {
    // exact means same set equality
    if (cardAspects.length !== selected.length) return false;
    const set = new Set(cardAspects);
    return selected.every(a => set.has(a));
  }
  // non-exact: at least one overlap
  const set = new Set(cardAspects);
  return selected.some(a => set.has(a));
};

export const costFilter = (
  card: CardDataWithVariants<CardListVariants>,
  costSel: Partial<Record<number | 'all', true>>,
) => {
  const keys = Object.keys(costSel).filter(k => k !== 'all');
  if (keys.length === 0) return true; // no active cost filter
  const cost = card.cost;
  if (cost == null) return false; // no cost -> filtered out when cost filter active
  for (const k of keys) {
    const n = Number(k);
    if (Number.isNaN(n)) continue;
    if (n === 6) {
      if (cost >= 6) return true;
    } else if (cost === n) {
      return true;
    }
  }
  return false;
};

export const typeFilter = (card: CardDataWithVariants<CardListVariants>, types: string[]) => {
  if (!types || types.length === 0) return true;
  if (types.includes('all')) return true;
  // Normalize checks
  const dt = getDisplayType(card);
  if (types.includes('Units')) {
    if (card.type === 'Unit') return true;
  }
  if (types.includes('Ground') && dt === 'Ground') return true;
  if (types.includes('Space') && dt === 'Space') return true;
  if (types.includes('Upgrade') && dt === 'Upgrade') return true;
  if (types.includes('Event') && dt === 'Event') return true;
  return false;
};

export const traitsFilter = (card: CardDataWithVariants<CardListVariants>, traits: string[]) => {
  if (!traits || traits.length === 0) return true;
  const map = card.traitMap || Object.fromEntries(card.traits.map(t => [t, true] as const));
  return traits.every(t => !!map[t]);
};

export const keywordsFilter = (
  card: CardDataWithVariants<CardListVariants>,
  keywords: string[],
) => {
  if (!keywords || keywords.length === 0) return true;
  const map = card.keywordMap || Object.fromEntries(card.keywords.map(t => [t, true] as const));
  return keywords.every(t => !!map[t]);
};

// 2) Grouping helpers
const aspectOrder = ['Command', 'Vigilance', 'Cunning', 'Aggression', 'Heroism', 'Villainy'];
const typeOrder = ['Ground', 'Space', 'Upgrade', 'Event'];
const costOrder = [0, 1, 2, 3, 4, 5, 6];

export const groupByKey = (
  cards: ExpandedCardData[],
  by: 'aspect' | 'type' | 'cost' | 'X',
): CardGroup[] => {
  if (by === 'X') {
    return [
      {
        title: 'All',
        cards: [
          {
            title: 'All',
            cards,
          },
        ],
      },
    ];
  }

  if (by === 'aspect') {
    return aspectOrder.map(aspect => ({
      title: aspect,
      cards: [
        {
          title: aspect,
          cards: cards.filter(c => c.card.aspectMap[aspect as SwuAspect]),
        },
      ],
    }));
  }

  if (by === 'type') {
    return typeOrder.map(title => ({
      title,
      cards: [
        {
          title,
          cards: cards.filter(c => getDisplayType(c.card) === (title as any)),
        },
      ],
    }));
  }

  // cost
  return costOrder.map(n => ({
    title: String(n),
    cards: [
      {
        title: String(n),
        cards: cards.filter(c => {
          const cost = c.card.cost ?? -1;
          return n === 6 ? cost >= 6 : cost === n;
        }),
      },
    ],
  }));
};

export const groupStacksWithin = (
  cards: ExpandedCardData[],
  by: 'aspect' | 'type' | 'cost',
): CardStack[] => {
  if (by === 'aspect') {
    return aspectOrder
      .map(aspect => ({
        title: aspect,
        cards: cards.filter(c => c.card.aspectMap[aspect as SwuAspect]),
      }))
      .filter(s => s.cards.length > 0);
  }
  if (by === 'type') {
    return typeOrder
      .map(title => ({
        title,
        cards: cards.filter(c => getDisplayType(c.card) === (title as any)),
      }))
      .filter(s => s.cards.length > 0);
  }
  // cost
  return costOrder
    .map(n => ({
      title: String(n),
      cards: cards.filter(c => {
        const cost = c.card.cost ?? -1;
        return n === 6 ? cost >= 6 : cost === n;
      }),
    }))
    .filter(s => s.cards.length > 0);
};
