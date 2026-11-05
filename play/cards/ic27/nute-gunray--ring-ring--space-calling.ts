import { ic27Unit } from './define.ts';

export const ic27NuteGunrayRingRingSpaceCalling = ic27Unit(
  'nute-gunray--ring-ring--space-calling',
  {
    auras: [
      {
        id: 'separatist-restore',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          trait: 'Separatist',
        },
        abilities: {
          restore: 1,
        },
      },
    ],
  },
);
