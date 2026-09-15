import type { UnitDefinition } from '../definition.ts';

// ASH 171. Printed text is pinned in meta-movement fixture.
export const pegasusTriWing = {
  cardId: 'pegasus-tri-wing',
  name: 'Pegasus Tri-Wing',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            controller: 'friendly',
          },
          min: 0,
          max: 1,
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'discard',
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
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
