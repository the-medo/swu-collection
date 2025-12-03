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

const aspectKeyForSorting = (card: CardDataWithVariants<CardListVariants>) =>
  card.aspects.join('-');

export const stackSorter = (a: ExpandedCardData, b: ExpandedCardData) => {
  const byAspect = aspectKeyForSorting(a.card).localeCompare(aspectKeyForSorting(b.card));
  if (byAspect !== 0) return byAspect;
  const byCost = (a.card.cost ?? 0) - (b.card.cost ?? 0);
  if (byCost !== 0) return byCost;
  return (a.card?.name ?? '').localeCompare(b.card?.name ?? '');
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
  leaderBaseAspects: SwuAspect[],
) => {
  if (aspectSetting === 'all') return true;
  const selected =
    aspectSetting === 'showOnlyLeaderAndBaseAspects' ? leaderBaseAspects : [aspectSetting];
  if (!selected || selected.length === 0) return true; // nothing to filter by

  const cardAspects = card.aspects;
  if (aspectSetting === 'showOnlyLeaderAndBaseAspects') {
    return cardAspects.every(a => leaderBaseAspects.includes(a));
  } else if (exact) {
    if (cardAspects.length !== selected.length) return false;
    return cardAspects.every(a => card.aspectMap[a]);
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
const aspectOrder: (SwuAspect | 'No Aspect')[] = [
  SwuAspect.COMMAND,
  SwuAspect.VIGILANCE,
  SwuAspect.CUNNING,
  SwuAspect.AGGRESSION,
  SwuAspect.HEROISM,
  SwuAspect.VILLAINY,
  'No Aspect',
];
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
          cards: cards.filter(c =>
            aspect === 'No Aspect'
              ? c.card.aspects.length === 0
              : c.card.aspectMap[aspect] &&
                ([SwuAspect.HEROISM, SwuAspect.VILLAINY].includes(aspect)
                  ? c.card.aspects.length === 1
                  : true),
          ),
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
        cards: cards
          .filter(c =>
            aspect === 'No Aspect'
              ? c.card.aspects.length === 0
              : c.card.aspectMap[aspect] &&
                ([SwuAspect.HEROISM, SwuAspect.VILLAINY].includes(aspect)
                  ? c.card.aspects.length === 1
                  : true),
          )
          .sort(stackSorter),
      }))
      .filter(s => s.cards.length > 0);
  }
  if (by === 'type') {
    return typeOrder
      .map(title => ({
        title,
        cards: cards.filter(c => getDisplayType(c.card) === (title as any)).sort(stackSorter),
      }))
      .filter(s => s.cards.length > 0);
  }
  // cost
  return costOrder
    .map(n => ({
      title: String(n),
      cards: cards
        .filter(c => {
          const cost = c.card.cost ?? -1;
          return n === 6 ? cost >= 6 : cost === n;
        })
        .sort(stackSorter),
    }))
    .filter(s => s.cards.length > 0);
};
