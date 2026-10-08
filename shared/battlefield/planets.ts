export const battlefieldPlanetTextureIds = ['rocky', 'ocean', 'desert', 'ice', 'gas'] as const;
export type BattlefieldPlanetTextureId = (typeof battlefieldPlanetTextureIds)[number];

export const battlefieldPlanetTextures: Record<
  BattlefieldPlanetTextureId,
  { name: string; color: string; frequency: string; seed: number; opacity: number }
> = {
  rocky: { name: 'Rocky', color: '#8ca2a3', frequency: '.28', seed: 7, opacity: 0.16 },
  ocean: { name: 'Ocean', color: '#59a5cb', frequency: '.045 .08', seed: 13, opacity: 0.2 },
  desert: { name: 'Desert', color: '#d5ab6b', frequency: '.035 .22', seed: 19, opacity: 0.18 },
  ice: { name: 'Ice', color: '#b5d4e0', frequency: '.09', seed: 23, opacity: 0.16 },
  gas: { name: 'Gas clouds', color: '#a998bf', frequency: '.012 .16', seed: 31, opacity: 0.24 },
};
