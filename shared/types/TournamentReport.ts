export type TournamentReportScore = { wins: number; losses: number; draws: number };

export type TournamentReportDeck = {
  id: string;
  name: string;
  leaderId: string | null;
  baseId: string | null;
  hasDecklist: boolean;
};

export type TournamentReportRound = {
  round: number;
  opponentName: string | null;
  opponentDeck: TournamentReportDeck | null;
  outcome: 'win' | 'loss' | 'draw' | 'bye' | 'unknown';
  games: TournamentReportScore | null;
  record: TournamentReportScore | null;
};

export type TournamentReport = {
  tournament: {
    id: string;
    name: string;
    date: string;
    format: string | null;
    attendance: number;
    placement: number | null;
    record: string | null;
    completed: boolean;
  };
  deck: TournamentReportDeck | null;
  rounds: TournamentReportRound[];
  hasMetaDecks: boolean;
};
