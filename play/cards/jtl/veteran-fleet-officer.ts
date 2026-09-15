import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const veteranFleetOfficer = {
  cardId: 'veteran-fleet-officer',
  name: 'Veteran Fleet Officer',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Resistance'],
  cost: 3,
  power: 2,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'launch',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'x-wing',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
