import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import type { TournamentWeekendResource } from '../liveTournamentTypes.ts';
import { TournamentWeekendStreamCard } from './TournamentWeekendStreamCard.tsx';

type StreamEntry = {
  resource: TournamentWeekendResource;
  tournamentName?: string;
};

export function TournamentWeekendStreamsDialog({
  open,
  onOpenChange,
  resources,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: StreamEntry[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(96vw,1280px)] max-w-6xl overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>All streams</DialogTitle>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {resources.map(({ resource, tournamentName }) => (
              <TournamentWeekendStreamCard
                key={resource.id}
                resource={resource}
                tournamentName={tournamentName}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
