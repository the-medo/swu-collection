import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const scavengingSandcrawler = {
  cardId: 'scavenging-sandcrawler',
  name: 'Scavenging Sandcrawler',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Vehicle', 'Transport'],
  cost: 4,
  power: 1,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'discard',
              to: 'deck-bottom',
              effects: [
                {
                  kind: 'create-credits',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
