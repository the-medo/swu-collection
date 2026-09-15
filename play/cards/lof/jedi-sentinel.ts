import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const jediSentinel = {
  cardId: 'jedi-sentinel',
  name: 'Jedi Sentinel',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'force-with-you',
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
