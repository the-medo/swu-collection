import React from 'react';
import { PriceBadgeTooltipCardmarket } from './PriceBadgeTooltipCardmarket';
import { PriceBadgeTooltipTcgplayer } from './PriceBadgeTooltipTcgplayer';

interface PriceBadgeTooltipProps {
  data: string | null;
  sourceType: string;
  sourceLink: string;
  updatedAt: Date | null;
  fetchedAt: Date;
}

export const PriceBadgeTooltip: React.FC<PriceBadgeTooltipProps> = ({
  data,
  sourceType,
  sourceLink,
  updatedAt,
  fetchedAt,
}) => {
  if (!data) return null;

  if (sourceType === 'cardmarket') {
    return (
      <PriceBadgeTooltipCardmarket
        data={data}
        sourceLink={sourceLink}
        updatedAt={updatedAt}
        fetchedAt={fetchedAt}
      />
    );
  }

  if (sourceType === 'tcgplayer') {
    return (
      <PriceBadgeTooltipTcgplayer
        data={data}
        sourceLink={sourceLink}
        updatedAt={updatedAt}
        fetchedAt={fetchedAt}
      />
    );
  }

  return null;
};
