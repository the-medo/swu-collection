import type { BattlefieldPlanetTextureId } from '../../../../../shared/battlefield/planets.ts';
import rocky from '../../../assets/battlefield/planets/rocky.png';
import ocean from '../../../assets/battlefield/planets/ocean.png';
import desert from '../../../assets/battlefield/planets/desert.png';
import ice from '../../../assets/battlefield/planets/ice.png';
import gas from '../../../assets/battlefield/planets/gas.png';
import grain from '../../../assets/battlefield/planets/grain.png';

// Fixed noise pixels avoid turbulence work during light changes and wheel zoom.
// Regenerate with frontend/scripts/generate-battlefield-planet-textures.ts.
export const battlefieldPlanetTextureImages: Record<BattlefieldPlanetTextureId, string> = {
  rocky,
  ocean,
  desert,
  ice,
  gas,
};
export const battlefieldPlanetGrainImage = grain;
