import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.tsx';
import { TournamentData } from '../../../../../types/Tournament.ts';

interface PQWeeklyDataProps {
  tournaments: TournamentData[];
}

export function PQWeeklyData({ tournaments }: PQWeeklyDataProps) {
  return (
    <AccordionItem value="weekly-data">
      <AccordionTrigger>PQ Weekly Data</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">PQ Tournaments Data</h3>
          <p className="text-sm text-gray-500">
            Displaying {tournaments.length} PQ tournaments
          </p>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[500px] text-xs">
            {JSON.stringify(tournaments, null, 2)}
          </pre>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}