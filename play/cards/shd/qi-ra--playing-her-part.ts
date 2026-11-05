import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteQiRaPlayingHerPart = {
  cardId: 'qi-ra--playing-her-part',
  name: "Qi'ra, Playing Her Part",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 0,
          bind: 'card',
          effects: [],
          after: [
            {
              kind: 'name-card',
              bind: 'name',
              effects: [
                {
                  kind: 'restrict-named-card',
                  name: 'name',
                  restriction: 'increase-cost',
                  amount: 3,
                  duration: 'source-in-play',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
