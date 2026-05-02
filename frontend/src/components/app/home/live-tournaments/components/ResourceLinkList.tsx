import type { TournamentWeekendResource } from '../liveTournamentTypes.ts';
import { getHostName } from '../liveTournamentUtils.ts';
import { ExternalButton } from './ExternalButton.tsx';

export function ResourceLinkList({ resources }: { resources: TournamentWeekendResource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {resources.map(resource => (
        <ExternalButton key={resource.id} href={resource.resourceUrl}>
          {resource.title || getHostName(resource.resourceUrl)}
        </ExternalButton>
      ))}
    </div>
  );
}
