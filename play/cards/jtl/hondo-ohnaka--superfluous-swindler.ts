import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const hondoOhnakaSuperfluousSwindler = {
  cardId: 'hondo-ohnaka--superfluous-swindler',
  name: 'Hondo Ohnaka, Superfluous Swindler',
  kind: 'unit',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Underworld'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'steal-upgrade',
      timing: 'attack',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            withoutTrait: 'Pilot',
          },
          min: 0,
          max: 1,
          bind: 'upgrade',
          effects: [
            {
              kind: 'take-control-upgrade',
              target: 'upgrade',
            },
            {
              kind: 'reattach-upgrade',
              target: 'upgrade',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
