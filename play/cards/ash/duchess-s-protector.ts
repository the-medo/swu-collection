import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const duchessSProtector = {
  cardId: 'duchess-s-protector',
  name: "Duchess's Protector",
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'mandalorian',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
