import * as React from 'react';
import { BookOpen } from 'lucide-react';

interface TeamDecksTabProps {
  teamId: string;
}

const TeamDecksTab: React.FC<TeamDecksTabProps> = ({ teamId: _teamId }) => {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <BookOpen className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">
        Team decks will appear here. Use the deck page to add decks to this team.
      </p>
    </div>
  );
};

export default TeamDecksTab;
