import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const jediKnight = {
  cardId: 'jedi-knight',
  name: 'Jedi Knight',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'initiative',
          },
          effects: [
            {
              kind: 'damage-unit',
              amount: 2,
              arena: 'ground',
              controller: 'enemy',
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
