import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGuerillaAttackPod = {
  cardId: 'guerilla-attack-pod',
  name: 'Guerilla Attack Pod',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Walker'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'base-damage-at-least',
            player: 'any',
            amount: 15,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
