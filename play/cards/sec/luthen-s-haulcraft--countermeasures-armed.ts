import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 hidden choices fixture.
export const luthenSHaulcraftCountermeasuresArmed = {
  cardId: 'luthen-s-haulcraft--countermeasures-armed',
  name: "Luthen's Haulcraft, Countermeasures Armed",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'disclose-discard',
      timing: 'defeated',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Aggression', 'Aggression', 'Heroism'],
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'owner',
              filter: {},
              min: 2,
              max: 2,
              bind: 'discarded',
              group: 'discarded-cards',
              effects: [
                {
                  kind: 'move-cards',
                  group: 'discarded-cards',
                  from: 'hand',
                  to: 'discard',
                  discardBy: 'owner',
                },
              ],
              after: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
