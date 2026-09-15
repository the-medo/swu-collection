import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const kiAdiMundiWeMustPushOn = {
  cardId: 'ki-adi-mundi--we-must-push-on',
  name: 'Ki-Adi-Mundi, We Must Push On',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'force-draw',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'draw-cards',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
