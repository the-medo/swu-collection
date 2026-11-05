import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDrydenVosOfferingNoEscape = {
  cardId: 'dryden-vos--offering-no-escape',
  name: 'Dryden Vos, Offering No Escape',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld'],
  cost: 7,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-captured',
          bind: 'captive',
          optional: false,
          effects: [
            {
              kind: 'play-card',
              from: 'captured',
              filter: {
                kind: 'unit',
              },
              optional: true,
              target: 'captive',
              free: true,
              takeControl: true,
            },
          ],
          guardFilter: {
            controller: 'friendly',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
