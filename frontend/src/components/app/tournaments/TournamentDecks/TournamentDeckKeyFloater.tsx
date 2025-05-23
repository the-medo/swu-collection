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
import { Route as TournamentDeckCardStatsRoute } from '@/routes/tournaments/$tournamentId/card-stats.tsx';
import { Route as TournamentDeckMetaRoute } from '@/routes/tournaments/$tournamentId/meta.tsx';
import { Route as TournamentDeckMatchupsRoute } from '@/routes/tournaments/$tournamentId/matchups.tsx';
import { Route as MetaRoute } from '@/routes/meta';
// import { Route } from '@/routes/__root.tsx';

export type TournamentDeckKeyFloaterRoutes =
  | typeof TournamentDeckCardStatsRoute
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

  let csLeaderId = key;
  let csBaseId = undefined;
  let csPage = 'leader';
  if (metaInfo === 'leadersAndBase') {
    [csLeaderId, csBaseId] = key.split('|');
    csPage = 'leader-base';
  }

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
          onClick={() => {
            if (route === MetaRoute) {
              navigate({
                search: prev => ({
                  ...prev,
                  page: 'decks',
                  maDeckKey: key,
                  maDeckKeyType: metaInfo,
                }),
              });
            } else {
              // @ts-ignore
              navigate({
                to: '../decks',
                search: prev => ({ ...prev, maDeckKey: key, maDeckKeyType: metaInfo }),
              });
            }
          }}
          className="btn btn-primary"
        >
          Show decks
        </Button>
        {(metaInfo === 'leaders' || metaInfo === 'leadersAndBase') && (
          <Button
            onClick={() => {
              if (route === MetaRoute) {
                navigate({
                  search: prev => ({
                    ...prev,
                    page: 'card-stats',
                    csPage,
                    csLeaderId,
                    csBaseId,
                  }),
                });
              } else {
                // @ts-ignore
                navigate({
                  to: '../card-stats',
                  search: prev => ({ ...prev, csLeaderId, csBaseId, csPage }),
                });
              }
            }}
            className="btn btn-primary"
          >
            Show card statistics
          </Button>
        )}
      </CardHeader>
    </Card>
  );
};

export default TournamentDeckKeyFloater;
