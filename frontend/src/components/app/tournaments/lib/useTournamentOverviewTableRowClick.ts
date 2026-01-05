import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { TournamentOverviewTableProps } from '@/components/app/tournaments/components/TournamentOverviewTable.tsx';
import * as React from 'react';

export function useTournamentOverviewTableRowClick(
  onRowClick?: TournamentOverviewTableProps['onRowClick'],
): NonNullable<TournamentOverviewTableProps['onRowClick']> {
  const navigate = useNavigate();
  return useCallback(
    (
      e: React.MouseEvent<HTMLTableRowElement | HTMLDivElement, MouseEvent>,
      tournamentId: string,
    ) => {
      if (onRowClick) return onRowClick(e, tournamentId);

      // Middle-click (auxiliary button) or explicit Ctrl/Meta click should always open new tab
      const isAuxClick = e.button === 1;
      const isModifier = e.ctrlKey || e.metaKey;

      const section = document.getElementById('section-container');
      const width = section?.getBoundingClientRect().width ?? window.innerWidth;

      const openTournamentInNewTab = () => {
        const url = `/tournaments/${tournamentId}`;
        window.open(url, '_blank', 'noopener');
      };

      if (isAuxClick || isModifier) {
        // Prevent default to avoid accidental text selection or other side-effects
        e.preventDefault();
        openTournamentInNewTab();
        return;
      }

      if (width < 1000) {
        e.preventDefault();
        openTournamentInNewTab();
      } else {
        // Keep current in-section navigation
        navigate({
          to: '.',
          search: prev => ({ ...prev, maDeckId: undefined, maTournamentId: tournamentId }),
        });
      }
    },
    [navigate, onRowClick],
  );
}
