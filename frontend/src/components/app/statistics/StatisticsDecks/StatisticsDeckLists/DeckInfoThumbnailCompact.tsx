import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { StatSectionCompact } from '@/components/app/statistics/common/StatSectionCompact.tsx';
import { Link } from '@tanstack/react-router';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';

interface DeckInfoThumbnailCompactProps {
  statistics: DeckStatistics | undefined;
}

const DeckInfoThumbnailCompact: React.FC<DeckInfoThumbnailCompactProps> = ({ statistics }) => {
  if (!statistics) return null;

  const {
    deckId,
    deckName,
    matchWinrate,
    gameWinrate,
    matchWins,
    matchLosses,
    gameWins,
    gameLosses,
  } = statistics;

  return (
    <Link to={'/statistics/decks'} search={prev => ({ ...prev, deckId })} className="w-full">
      <Card className="overflow-hidden relative w-full hover:bg-muted/50 transition-colors">
        <CardContent className="p-2 flex justify-between">
          <div className="p-2 flex flex-col items-start gap-2">
            <h6 className="truncate text-xs font-bold mb-0! flex-1 max-w-[250px]">{deckName}</h6>
            <div className="flex gap-4 shrink-0">
              <StatSectionCompact
                label="G"
                wins={gameWins}
                losses={gameLosses}
                winrate={gameWinrate}
              />
              <StatSectionCompact
                label="M"
                wins={matchWins}
                losses={matchLosses}
                winrate={matchWinrate}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <CopyLinkButton deckId={deckId} isPublic={true} compact={true} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default DeckInfoThumbnailCompact;
