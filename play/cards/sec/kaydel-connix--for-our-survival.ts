import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const kaydelConnixForOurSurvival = {
  cardId: 'kaydel-connix--for-our-survival',
  name: 'Kaydel Connix, For Our Survival',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Plot'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                unique: false,
                attachedTo: 'chosen',
              },
              min: 'all',
              max: 'all',
              bind: 'upgrades',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'upgrades',
                  to: 'discard',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
