import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJesseHardFightingPatriot = {
  cardId: 'jesse--hard-fighting-patriot',
  name: 'Jesse, Hard-Fighting Patriot',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  raid: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 2,
          player: 'enemy',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
