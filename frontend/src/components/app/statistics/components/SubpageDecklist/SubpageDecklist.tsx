import * as React from 'react';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import DeckContents from '@/components/app/decks/DeckContents/DeckContents.tsx';

interface SubpageDecklistProps {
  deckStatistics: DeckStatistics;
}

const SubpageDecklist: React.FC<SubpageDecklistProps> = ({ deckStatistics }) => {
  return <DeckContents deckId={deckStatistics.deckId} />;
};

export default SubpageDecklist;
