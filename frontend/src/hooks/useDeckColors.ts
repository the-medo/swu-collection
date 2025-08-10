import { useMemo } from 'react';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData';
import { hexToRgb } from '@/lib/hexToRgb';
import { SwuAspect } from '../../../types/enums.ts';
import { aspectColors } from '../../../shared/lib/aspectColors.ts';

type ColorType = 'hex' | 'rgb';

interface HexColors {
  leaderColor: string | null;
  baseColor: string | null;
  cssBackground: string;
}

interface RgbColors {
  leaderColor: { r: number; g: number; b: number } | null;
  baseColor: { r: number; g: number; b: number } | null;
  cssBackground: string;
}

/**
 * Hook to get deck colors based on leader and base aspects
 * @param deckId - The ID of the deck
 * @param type - The type of color values to return ('hex' or 'rgb')
 * @returns Object with leader color, base color, and CSS background
 */
export const useDeckColors = (deckId: string, type: ColorType = 'rgb') => {
  const { leaderCard, baseCard } = useDeckData(deckId);

  return useMemo(() => {
    // Get the color aspects for gradient
    const leaderColorAspect = leaderCard?.aspects.find(
      a => a !== SwuAspect.VILLAINY && a !== SwuAspect.HEROISM,
    );
    const baseColorAspect = baseCard?.aspects[0];

    // Default return values
    const defaultHexReturn: HexColors = {
      leaderColor: null,
      baseColor: null,
      cssBackground: '',
    };

    const defaultRgbReturn: RgbColors = {
      leaderColor: null,
      baseColor: null,
      cssBackground: '',
    };

    // If no leader color aspect, return defaults
    if (!leaderColorAspect || !aspectColors[leaderColorAspect]) {
      return type === 'hex' ? defaultHexReturn : defaultRgbReturn;
    }

    // Get hex colors
    const leaderHexColor = aspectColors[leaderColorAspect];
    const baseHexColor = baseColorAspect ? aspectColors[baseColorAspect] : null;

    // Convert to RGB
    const leaderRgb = hexToRgb(leaderHexColor);
    const baseRgb = baseHexColor ? hexToRgb(baseHexColor) : null;

    // Create CSS background
    let cssBackground = '';
    if (baseRgb) {
      // Create gradient with both colors
      cssBackground = `linear-gradient(to right, rgba(${leaderRgb.r}, ${leaderRgb.g}, ${leaderRgb.b}, 0.85), rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, 0.85))`;
    } else {
      // Fallback to just leaderColorAspect
      cssBackground = `rgba(${leaderRgb.r}, ${leaderRgb.g}, ${leaderRgb.b}, 0.85)`;
    }

    // Return based on requested type
    if (type === 'hex') {
      return {
        leaderColor: leaderHexColor,
        baseColor: baseHexColor,
        cssBackground,
      };
    } else {
      return {
        leaderColor: leaderRgb,
        baseColor: baseRgb,
        cssBackground,
      };
    }
  }, [leaderCard, baseCard, type]);
};
