import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const intimidatorCitadelOverwatch = {
  cardId: 'intimidator--citadel-overwatch',
  name: 'Intimidator, Citadel Overwatch',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 11,
  power: 11,
  hp: 11,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'resources',
          player: 'self',
          chooser: 'self',
          min: 0,
          max: {
            kind: 'zone-size',
            zone: 'resources',
            player: 'self',
          },
          filter: {},
          bind: 'chosen',
          group: 'returned',
          effects: [
            { kind: 'move-cards', from: 'resources', to: 'hand', group: 'returned' },
            { kind: 'create-credits', amount: { kind: 'group-size', group: 'returned' } },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
