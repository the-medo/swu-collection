import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 hidden choices fixture.
export const reanimatedNightTrooper = {
  cardId: 'reanimated-night-trooper',
  name: 'Reanimated Night Trooper',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Night', 'Undead', 'Trooper'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'look-top',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'self',
              effects: [
                {
                  kind: 'look-deck',
                  player: 'self',
                  count: 1,
                  mode: 'discard-one',
                },
              ],
            },
            {
              id: 'enemy',
              effects: [
                {
                  kind: 'look-deck',
                  player: 'enemy',
                  count: 1,
                  mode: 'discard-one',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
