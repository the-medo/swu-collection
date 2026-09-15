import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const acclamatorAssaultShip = {
  cardId: 'acclamator-assault-ship',
  name: 'Acclamator Assault Ship',
  kind: 'unit',
  aspects: ['Command', 'Command'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  cost: 7,
  power: 5,
  hp: 8,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 5,
                hp: 5,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
