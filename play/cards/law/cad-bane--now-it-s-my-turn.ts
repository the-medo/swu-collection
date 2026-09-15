import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const cadBaneNowItSMyTurn = {
  cardId: 'cad-bane--now-it-s-my-turn',
  name: "Cad Bane, Now It's My Turn",
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Shielded', 'Overwhelm'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'defeat-credits',
          countAs: 'credits',
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: {
                  kind: 'value',
                  name: 'credits',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
