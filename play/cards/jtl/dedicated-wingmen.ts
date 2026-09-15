import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const dedicatedWingmen = {
  cardId: 'dedicated-wingmen',
  name: 'Dedicated Wingmen',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Supply'],
  cost: 4,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'x-wing',
      count: 2,
    },
  ],
} as const satisfies EventDefinition;
