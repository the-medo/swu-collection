import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const chargedWithCorruption = {
  cardId: 'charged-with-corruption',
  name: 'Charged with Corruption',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Law'],
  cost: 3,
  effects: [
    {
      kind: 'disclose',
      aspects: ['Command', 'Command'],
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'guard',
          optional: false,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                nonLeader: true,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'capture-unit',
                  guard: 'guard',
                  target: 'chosen',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
