import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const inTheHeatOfBattle = {
  cardId: 'in-the-heat-of-battle',
  name: 'In the Heat of Battle',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Disaster'],
  cost: 2,
  effects: [
    {
      kind: 'modify-units',
      filter: {},
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          keywords: ['Sentinel'],
        },
        lostKeywords: ['Saboteur'],
      },
    },
  ],
} as const satisfies EventDefinition;
