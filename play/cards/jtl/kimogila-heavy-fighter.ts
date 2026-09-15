import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const kimogilaHeavyFighter = {
  cardId: 'kimogila-heavy-fighter',
  name: 'Kimogila Heavy Fighter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'indirect-exhaust',
      timing: 'played',
      effects: [
        {
          kind: 'indirect-damage',
          recipient: 'chosen',
          amount: 3,
          after: [
            {
              kind: 'exhaust-group',
              group: 'damaged-units',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
