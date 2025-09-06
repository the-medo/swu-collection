import { DeckGroupBy } from '../../../../../../../../types/enums.ts';

export enum DeckImagePresetVariant {
  Standard = 'Standard',
  Hyperspace = 'Hyperspace',
  StandardPrestige = 'Standard Prestige',
}

export type DeckImagePresets = {
  showNoisyBackground?: boolean;
  showcaseLeader?: boolean;
  hyperspaceBase?: boolean;
  defaultVariantName?: DeckImagePresetVariant;
  groupBy?: DeckGroupBy;
};
