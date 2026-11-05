import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMigsMayfeldTriggerman = {
  cardId: 'migs-mayfeld--triggerman',
  name: 'Migs Mayfeld, Triggerman',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'hand-card-discarded',
      timing: 'hand-card-discarded',
      effects: [
        {
          kind: 'select-target',
          units: {},
          bases: 'any',
          bind: 'victim',
          optional: false,
          effects: [
            {
              kind: 'damage-target',
              target: 'victim',
              amount: 2,
            },
          ],
        },
      ],
      optional: true,
      limit: 'once-per-round',
    },
  ],
} as const satisfies UnitDefinition;
