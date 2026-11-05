import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChewbaccaLoyalCompanion = {
  cardId: 'chewbacca--loyal-companion',
  name: 'Chewbacca, Loyal Companion',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld', 'Wookiee'],
  cost: 5,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'attacked',
      timing: 'attacked',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'ready',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
