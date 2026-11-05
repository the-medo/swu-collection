import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePlanetaryInvasion = {
  cardId: 'planetary-invasion',
  name: 'Planetary Invasion',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Plan'],
  cost: 12,
  effects: [
    {
      kind: 'select-units',
      filter: {},
      bind: 'chosen',
      min: 0,
      max: 3,
      effects: [
        {
          kind: 'each-unit',
          filter: {
            inGroup: 'chosen',
          },
          bind: 'recipient',
          effects: [
            {
              kind: 'on-unit',
              target: 'recipient',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
        {
          kind: 'each-unit',
          filter: {
            inGroup: 'chosen',
          },
          bind: 'recipient',
          effects: [
            {
              kind: 'on-unit',
              target: 'recipient',
              operation: {
                kind: 'modify',
                power: 1,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Overwhelm'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
  exploit: 3,
} as const satisfies EventDefinition;
