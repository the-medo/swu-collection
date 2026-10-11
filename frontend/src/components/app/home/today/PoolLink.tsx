import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Visibility } from '../../../../../../shared/types/visibility.ts';

export function PoolLink({
  poolId,
  children,
  className,
  startPublicDeck = false,
}: {
  poolId: string;
  children: ReactNode;
  className?: string;
  startPublicDeck?: boolean;
}) {
  return (
    <Link
      to="/limited/pool/$poolId/detail"
      params={{ poolId }}
      search={{
        poolDeckVisibility: startPublicDeck ? Visibility.Public : undefined,
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
