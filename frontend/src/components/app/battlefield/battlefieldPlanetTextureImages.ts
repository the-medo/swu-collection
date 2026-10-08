import type { BattlefieldPlanetTextureId } from '../../../../../shared/battlefield/planets.ts';

const textureDirectory = 'https://images.swubase.com/battlefields/textures';

// Fixed noise pixels avoid turbulence work during light changes and wheel zoom.
export const battlefieldPlanetTextureImages: Record<BattlefieldPlanetTextureId, string> = {
  rocky: `${textureDirectory}/rocky.png`,
  ocean: `${textureDirectory}/ocean.png`,
  desert: `${textureDirectory}/desert.png`,
  ice: `${textureDirectory}/ice.png`,
  gas: `${textureDirectory}/gas.png`,
};
export const battlefieldPlanetGrainImage = `${textureDirectory}/grain.png`;
