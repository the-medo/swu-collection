import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const diplomaticEnvoy = {
  cardId: 'diplomatic-envoy',
  name: 'Diplomatic Envoy',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Vehicle', 'Transport'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command'],
          effects: [
            {
              kind: 'next-play',
              filter: {
                kind: 'unit',
              },
              phaseAbilities: {
                keywords: ['Ambush'],
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
