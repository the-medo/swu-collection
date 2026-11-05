import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteValiantAssaultShip = {
  cardId: 'valiant-assault-ship',
  name: 'Valiant Assault Ship',
  kind: 'unit',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'fewer-resources-than-opponent',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
