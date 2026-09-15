import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const anakinSkywalkerSecretHusband = {
  cardId: 'anakin-skywalker--secret-husband',
  name: 'Anakin Skywalker, Secret Husband',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
  constant: [
    {
      condition: {
        kind: 'controls-name',
        name: 'Padmé Amidala',
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
