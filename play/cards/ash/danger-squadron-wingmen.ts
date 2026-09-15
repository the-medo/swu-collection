import type { UnitDefinition } from '../definition.ts';

// ASH 157. Printed text is pinned in meta-board fixture.
export const dangerSquadronWingmen = {
  cardId: 'danger-squadron-wingmen',
  name: 'Danger Squadron Wingmen',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            otherThan: 'source',
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
