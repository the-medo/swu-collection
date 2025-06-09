import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.tsx';
import { format } from 'date-fns';
import { WeekData } from '@/components/app/admin/PQToolsPage/types.ts';

interface PQWeeklyDivisionProps {
  weeklyTournaments: WeekData[];
  totalTournaments: number;
}

export function PQWeeklyDivision({ weeklyTournaments, totalTournaments }: PQWeeklyDivisionProps) {
  // Format date as MM/DD using date-fns
  const formatDate = (date: Date | string) => {
    return format(date, 'MM/dd');
  };

  return (
    <AccordionItem value="weekly-division">
      <AccordionTrigger>PQ Weekly Division</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">PQ Tournaments by Week</h3>
          <p className="text-sm text-gray-500">
            Displaying {totalTournaments} PQ tournaments across {weeklyTournaments.length} weeks
          </p>

          <div className="space-y-6">
            {weeklyTournaments.map(week => (
              <div key={week.weekNumber} className="border rounded-md p-4">
                <h4 className="text-md font-medium">
                  Week {week.weekNumber} ({formatDate(week.startDate)} - {formatDate(week.endDate)})
                </h4>
                <ul className="list-disc pl-6 mt-2">
                  {week.tournaments.map(tournament => (
                    <li key={tournament.tournament.id} className="text-sm">
                      {tournament.tournament.name} - {formatDate(tournament.tournament.date)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
