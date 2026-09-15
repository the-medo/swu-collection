import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const jocastaNuTheGiftOfKnowledge = {
  cardId: 'jocasta-nu--the-gift-of-knowledge',
  name: 'Jocasta Nu, The Gift of Knowledge',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                controller: 'friendly',
                attachedTo: 'chosen',
              },
              min: 0,
              max: 1,
              bind: 'upgrade',
              effects: [
                {
                  kind: 'reattach-upgrade',
                  target: 'upgrade',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
