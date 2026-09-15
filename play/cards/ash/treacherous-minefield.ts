import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const treacherousMinefield = {
  cardId: 'treacherous-minefield',
  name: 'Treacherous Minefield',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 2,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'ground',
          effects: [
            {
              kind: 'modify-units',
              filter: {
                arena: 'ground',
              },
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  triggers: [
                    {
                      id: 'attack',
                      timing: 'attack',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'source',
                          operation: {
                            kind: 'damage',
                            amount: 2,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
        {
          id: 'space',
          effects: [
            {
              kind: 'modify-units',
              filter: {
                arena: 'space',
              },
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  triggers: [
                    {
                      id: 'attack',
                      timing: 'attack',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'source',
                          operation: {
                            kind: 'damage',
                            amount: 2,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
