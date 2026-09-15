import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const t6Shuttle1974StayClose = {
  cardId: 't-6-shuttle-1974--stay-close',
  name: 'T-6 Shuttle 1974, Stay Close',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'on-defense',
      timing: 'attacked',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            sameAs: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
