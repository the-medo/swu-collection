import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const jangoFettWilyMercenary = {
  cardId: 'jango-fett--wily-mercenary',
  name: 'Jango Fett, Wily Mercenary',
  kind: 'unit',
  aspects: ['Vigilance', 'Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 5,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
