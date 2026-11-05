import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRedThreeUnstoppable = {
  cardId: 'red-three--unstoppable',
  name: 'Red Three, Unstoppable',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'space',
  raid: 1,
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
        anyAspect: ['Heroism'],
      },
      abilities: {
        raid: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
