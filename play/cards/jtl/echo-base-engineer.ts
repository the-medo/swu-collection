import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const echoBaseEngineer = {
  cardId: 'echo-base-engineer',
  name: 'Echo Base Engineer',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'shield-damaged-vehicle',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            damaged: true,
            trait: 'Vehicle',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
