import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCovetousRivals = {
  cardId: 'covetous-rivals',
  name: 'Covetous Rivals',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Bounty Hunter'],
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            hasBounty: true,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            hasBounty: true,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
