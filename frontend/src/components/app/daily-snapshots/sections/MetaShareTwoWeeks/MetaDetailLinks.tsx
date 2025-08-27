import * as React from 'react';
import { Link } from '@tanstack/react-router';

export const metaDetailLinkClass =
  'rounded-md px-2 py-1 text-xs font-medium border bg-muted hover:bg-muted/80';

export type MetaDetailPage = 'meta' | 'matchups' | 'decks' | 'card-stats';

export interface MetaDetailLinkProps {
  tournamentGroupId: string | number;
  page: MetaDetailPage;
  children?: React.ReactNode;
}

export const MetaDetailLink: React.FC<MetaDetailLinkProps> = ({
  tournamentGroupId,
  page,
  children,
}) => {
  return (
    <Link
      to="/meta"
      search={prev => ({
        ...prev,
        maTournamentGroupId: tournamentGroupId,
        page,
      })}
      className={metaDetailLinkClass}
    >
      {children ??
        (page === 'card-stats' ? 'Card stats' : page.charAt(0).toUpperCase() + page.slice(1))}
    </Link>
  );
};

export interface MetaDetailLinksProps {
  tournamentGroupId: string | number;
}

const MetaDetailLinks: React.FC<MetaDetailLinksProps> = ({ tournamentGroupId }) => {
  return (
    <div className="mt-2 flex flex-row flex-wrap gap-1 items-center justify-center">
      <span className="text-xs text-muted-foreground">Open more detailed info here:</span>
      <div className="flex flex-row gap-2 items-center">
        <MetaDetailLink tournamentGroupId={tournamentGroupId} page="meta">
          Meta
        </MetaDetailLink>
        <MetaDetailLink tournamentGroupId={tournamentGroupId} page="matchups">
          Matchups
        </MetaDetailLink>
        <MetaDetailLink tournamentGroupId={tournamentGroupId} page="decks">
          Decks
        </MetaDetailLink>
        <MetaDetailLink tournamentGroupId={tournamentGroupId} page="card-stats">
          Card stats
        </MetaDetailLink>
      </div>
    </div>
  );
};

export default MetaDetailLinks;
