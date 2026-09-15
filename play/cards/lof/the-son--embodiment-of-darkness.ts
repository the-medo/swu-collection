import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const theSonEmbodimentOfDarkness = {
  cardId: 'the-son--embodiment-of-darkness',
  name: 'The Son, Embodiment of Darkness',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 8,
  arena: 'ground',
  auras: [
    {
      id: 'dark-empowerment',
      filter: {
        controller: 'friendly',
        condition: {
          kind: 'force-with-you',
        },
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
