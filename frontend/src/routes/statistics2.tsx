import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useGetKarabastGameResults } from '@/api/integration/useGetKarabastGameResults.ts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { DISCORD_LINK } from '../../../shared/consts/constants.ts';

const StatisticsPage: React.FC = () => {
  const { data, isLoading } = useGetKarabastGameResults();

  return (
    <div className="container mx-auto py-8 px-4">
      <h3 className="text-3xl font-bold mb-6">Your Statistics</h3>
      <p className="mb-4">
        Integration of SWUBase with Karabast is under way! <br /> You will be able to:{' '}
        <ul className="list-disc ml-5 space-y-0">
          <li>See your match history</li>
          <li>View statistics of your decks, Bo1 or Bo3</li>
          <li>Add your matches manually</li>
        </ul>
        To keep up with news about this and all other planned features, head over to the{' '}
        <a
          href={DISCORD_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          #swubase-updates channel on Discord
        </a>
        !
      </p>

      <div className="mt-8">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game ID</TableHead>
                <TableHead>Lobby ID</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Raw Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data && data.length > 0 ? (
                data.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.gameId}</TableCell>
                    <TableCell>{row.lobbyId}</TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <pre className="text-[10px] max-h-[100px] max-w-xs overflow-auto">
                        {JSON.stringify(row.data, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Just for testing purposes only
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute('/statistics2')({
  component: StatisticsPage,
});
