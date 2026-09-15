import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const theMandalorianCleaningUpNevarro = {
  cardId: 'the-mandalorian--cleaning-up-nevarro',
  name: 'The Mandalorian, Cleaning Up Nevarro',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Mandalorian', 'Bounty Hunter'],
  unique: true,
  cost: 8,
  power: 6,
  hp: 8,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'capture',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                nonLeader: true,
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'capture-unit',
                  guard: 'source',
                  target: 'chosen',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
