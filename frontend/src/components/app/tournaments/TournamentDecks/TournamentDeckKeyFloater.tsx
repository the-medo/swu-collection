import * as React from 'react';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  useSelectedDeckKey,
  useTournamentMetaActions,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Route as TournamentDeckMetaRoute } from '@/routes/tournaments/$tournamentId/meta.tsx';
import { Route as TournamentDeckMatchupsRoute } from '@/routes/tournaments/$tournamentId/matchups.tsx';
import { Route as MetaRoute } from '@/routes/meta';
// import { Route } from '@/routes/__root.tsx';

export type TournamentDeckKeyFloaterRoutes =
  | typeof TournamentDeckMatchupsRoute
  | typeof TournamentDeckMetaRoute
  | typeof MetaRoute;

interface TournamentDeckKeyFloaterProps {
  route: TournamentDeckKeyFloaterRoutes;
}

const TournamentDeckKeyFloater: React.FC<TournamentDeckKeyFloaterProps> = ({ route }) => {
  const { key, metaInfo } = useSelectedDeckKey();
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const labelRenderer = useLabel();

  const navigate = useNavigate({ from: route.fullPath });

  if (!key || !metaInfo) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-[300px] border">
      <CardHeader className="p-4">
        <div className="w-full flex gap-4 justify-between items-center">
          {labelRenderer(key, metaInfo, 'compact', 'left')}
          <Button variant="outline" size="iconSmall" onClick={() => setTournamentDeckKey({})}>
            <X />
          </Button>
        </div>
        <Button
          onClick={() =>
            navigate({
              to: '../decks',
              search: prev => ({ ...prev, maDeckKey: key, maDeckKeyType: metaInfo }),
            })
          }
          className="btn btn-primary"
        >
          Display decks
        </Button>
      </CardHeader>
    </Card>
  );
};

export default TournamentDeckKeyFloater;
