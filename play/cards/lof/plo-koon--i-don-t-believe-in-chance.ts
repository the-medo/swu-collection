import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const ploKoonIDonTBelieveInChance = {
  cardId: 'plo-koon--i-don-t-believe-in-chance',
  name: "Plo Koon, I Don't Believe in Chance",
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 8,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'force-with-you',
      },
      abilities: {
        keywords: ['Grit'],
      },
    },
  ],
} as const satisfies UnitDefinition;
