import React from 'react';
import { PriceBadgeTooltipCardmarket } from './PriceBadgeTooltipCardmarket';
import { PriceBadgeTooltipTcgplayer } from './PriceBadgeTooltipTcgplayer';

interface PriceBadgeTooltipProps {
  data: string | null;
  sourceType: string;
  sourceLink?: string;
  updatedAt?: Date | null;
  fetchedAt?: Date;
  customMessages?: string[];
  warningMessages?: string[];
}

export const PriceBadgeTooltip: React.FC<PriceBadgeTooltipProps> = ({
  data,
  sourceType,
  sourceLink,
  updatedAt,
  fetchedAt,
  customMessages,
  warningMessages,
}) => {
  if (!data) return null;

  if (sourceType === 'cardmarket') {
    return (
      <PriceBadgeTooltipCardmarket
        data={data}
        sourceLink={sourceLink}
        updatedAt={updatedAt}
        fetchedAt={fetchedAt}
        customMessages={customMessages}
        warningMessages={warningMessages}
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
        customMessages={customMessages}
        warningMessages={warningMessages}
      />
    );
  }

  return null;
};
