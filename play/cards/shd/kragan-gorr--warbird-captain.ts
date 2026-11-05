import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKraganGorrWarbirdCaptain = {
  cardId: 'kragan-gorr--warbird-captain',
  name: 'Kragan Gorr, Warbird Captain',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld'],
  cost: 6,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'own-base-attacked',
      timing: 'own-base-attacked',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            sameArenaAs: 'subject',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
