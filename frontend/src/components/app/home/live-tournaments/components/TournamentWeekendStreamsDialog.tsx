import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import type {
  LiveTournamentWeekendTournamentEntry,
  TournamentWeekendResource,
} from '../liveTournamentTypes.ts';
import { TournamentWeekendStreamCard } from './TournamentWeekendStreamCard.tsx';

type StreamEntry = {
  resource: TournamentWeekendResource;
  tournament?: LiveTournamentWeekendTournamentEntry;
};

export function TournamentWeekendStreamsDialog({
  open,
  onOpenChange,
  resources,
  selectedStreamId,
  onSelectStream,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: StreamEntry[];
  selectedStreamId?: string;
  onSelectStream?: (streamId: string) => void;
}) {
  const isSwitchMode = onSelectStream !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(96vw,1280px)] max-w-6xl overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>{isSwitchMode ? 'Switch stream' : 'All streams'}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {resources.map(({ resource, tournament }) => (
              <TournamentWeekendStreamCard
                key={resource.id}
                resource={resource}
                tournament={tournament}
                showWatchLink={!isSwitchMode}
                footerAction={
                  isSwitchMode ? (
                    <Button
                      type="button"
                      variant={resource.id === selectedStreamId ? 'secondary' : 'outline'}
                      size="sm"
                      className="w-full"
                      disabled={resource.id === selectedStreamId}
                      onClick={() => {
                        onSelectStream(resource.id);
                        onOpenChange(false);
                      }}
                    >
                      {resource.id === selectedStreamId ? 'Current stream' : 'Switch here'}
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
