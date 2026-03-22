import { DeckGroupBy } from './enums.ts';

export enum DeckImagePresetVariant {
  Standard = 'Standard',
  Hyperspace = 'Hyperspace',
  StandardPrestige = 'Standard Prestige',
}

export type DeckImageViewMode = 'full' | 'small';

export type DeckImagePresets = {
  showNoisyBackground?: boolean;
  showQr?: boolean;
  showcaseLeader?: boolean;
  hyperspaceBase?: boolean;
  defaultVariantName?: DeckImagePresetVariant;
  groupBy?: DeckGroupBy;
  imageViewMode?: DeckImageViewMode;
};
