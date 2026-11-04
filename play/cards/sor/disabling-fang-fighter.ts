import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDisablingFangFighter = {
  cardId: 'disabling-fang-fighter',
  name: 'Disabling Fang Fighter',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Mandalorian', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-upgrade',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
