import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChainCodeCollector = {
  cardId: 'chain-code-collector',
  name: 'Chain Code Collector',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 4,
  power: 4,
  hp: 2,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'defender',
            filter: {
              hasBounty: true,
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'defender',
              operation: {
                kind: 'modify',
                power: -4,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
