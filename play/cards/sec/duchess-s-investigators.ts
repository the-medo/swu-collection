import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const duchessSInvestigators = {
  cardId: 'duchess-s-investigators',
  name: "Duchess's Investigators",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Mandalorian'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Cunning'],
          effects: [
            {
              kind: 'discard-random-hand',
              player: 'enemy',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
