import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFennecShandLoyalSharpshooter = {
  cardId: 'fennec-shand--loyal-sharpshooter',
  name: 'Fennec Shand, Loyal Sharpshooter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 7,
  unique: true,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'defender',
          operation: {
            kind: 'damage',
            amount: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              distinctBy: 'cost',
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
