import * as React from 'react';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup';
import { isFuture } from 'date-fns';
import { Calendar, CheckCircle, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PQStatisticsProps {
  tournamentGroups: TournamentGroupWithMeta[];
}

const PQStatistics: React.FC<PQStatisticsProps> = ({ tournamentGroups }) => {
  // Calculate statistics
  const statistics = React.useMemo(() => {
    // Flatten all tournaments from all groups
    const allTournaments = tournamentGroups.flatMap(group => group.tournaments.map(t => t.tournament));
    
    // Total number of tournaments
    const totalTournaments = allTournaments.length;
    
    // Number of imported tournaments
    const importedTournaments = allTournaments.filter(t => t.imported).length;
    
    // Number of upcoming tournaments
    const upcomingTournaments = allTournaments.filter(t => isFuture(new Date(t.date))).length;
    
    return {
      totalTournaments,
      importedTournaments,
      upcomingTournaments
    };
  }, [tournamentGroups]);

  return (
    <div className="px-4 py-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Tournaments Card */}
        <Card>
          <CardContent className="pt-6 flex items-center">
            <div className="bg-primary/10 p-3 rounded-full mr-4">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tournaments</p>
              <h3 className="text-2xl font-bold">{statistics.totalTournaments}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Imported Tournaments Card */}
        <Card>
          <CardContent className="pt-6 flex items-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mr-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Imported Tournaments</p>
              <h3 className="text-2xl font-bold">{statistics.importedTournaments} / {statistics.totalTournaments}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tournaments Card */}
        <Card>
          <CardContent className="pt-6 flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Tournaments</p>
              <h3 className="text-2xl font-bold">{statistics.upcomingTournaments}</h3>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PQStatistics;