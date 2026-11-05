import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLandoCalrissianResponsibleBusinessman = {
  cardId: 'lando-calrissian--responsible-businessman',
  name: 'Lando Calrissian, Responsible Businessman',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Official'],
  cost: 6,
  unique: true,
  power: 6,
  hp: 5,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'resources',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 2,
          bind: 'card',
          effects: [
            {
              kind: 'move-cards',
              group: 'returned',
              from: 'resources',
              to: 'hand',
            },
          ],
          group: 'returned',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
