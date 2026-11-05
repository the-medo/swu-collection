import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLowAltitudeGunship = {
  cardId: 'low-altitude-gunship',
  name: 'Low Altitude Gunship',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Transport'],
  cost: 6,
  power: 6,
  hp: 5,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'unit-count',
                filter: {
                  controller: 'friendly',
                  trait: 'Republic',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
