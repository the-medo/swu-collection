import { useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { MoreHorizontal, Trophy } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { dateRenderer } from '@/lib/table/dateRenderer.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { DataTableViewMode, ExtendedColumnDef } from '@/components/ui/data-table.tsx';
import {
  TournamentStringDate,
  TournamentData,
  tournamentTypesInfo,
} from '../../../../../../types/Tournament.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';

export interface TournamentTableColumnsProps {
  view?: DataTableViewMode;
  onEdit?: (tournament: TournamentStringDate) => void;
  onDelete?: (tournament: TournamentStringDate) => void;
}

export function useTournamentTableColumns({
  // view = 'table',
  onEdit,
  onDelete,
}: TournamentTableColumnsProps): ExtendedColumnDef<TournamentData>[] {
  const hasPermission = usePermissions();
  const { data: cardList } = useCardList();

  const canUpdate = hasPermission('tournament', 'update');
  const canDelete = hasPermission('tournament', 'delete');

  return useMemo(() => {
    const definitions: ExtendedColumnDef<TournamentData>[] = [];

    // Thumbnail column
    definitions.push({
      id: 'thumbnail',
      header: '',
      size: 16,
      displayBoxHeader: false,
      cell: ({ row }) => {
        const tournamentId = row.original.tournament.id as string;
        const thumbnailUrl = `https://images.swubase.com/tournament/${tournamentId}.webp`;

        return (
          <div className="flex items-center justify-center">
            <img
              src={thumbnailUrl}
              alt="Tournament thumbnail"
              className="w-16 h-8 object-cover rounded"
            />
          </div>
        );
      },
    });

    // Name column
    definitions.push({
      id: 'name',
      accessorKey: 'tournament.name',
      header: 'Name',
      displayBoxHeader: false,
      cell: ({ getValue, row }) => {
        const name = getValue() as string;
        const tournamentId = row.original.tournament.id as string;

        return (
          <Link to={'/tournaments/' + tournamentId} className="font-bold">
            <Button
              variant="link"
              className="flex flex-col gap-0 p-0 w-full items-start justify-center"
            >
              {name}
            </Button>
          </Link>
        );
      },
    });

    // Winning Deck column
    definitions.push({
      id: 'winningDeck',
      header: 'Winning Deck',
      size: 24,
      displayBoxHeader: false,
      cell: ({ row }) => {
        const winningDeck = row.original.decks?.find(d => d.tournamentDeck.placement === 1);

        if (!winningDeck || !cardList) return <div>No winning deck</div>;

        console.log({ winningDeck });

        const leader1 = winningDeck.deck.leaderCardId1
          ? cardList.cards[winningDeck.deck.leaderCardId1]
          : undefined;
        const leader2 = winningDeck.deck.leaderCardId2
          ? cardList.cards[winningDeck.deck.leaderCardId2]
          : undefined;
        const base = winningDeck.deck.baseCardId
          ? cardList.cards[winningDeck.deck.baseCardId]
          : undefined;

        return (
          <div className="flex gap-1">
            <CardImage
              card={leader1}
              cardVariantId={leader1 ? selectDefaultVariant(leader1) : undefined}
              forceHorizontal={true}
              size="w50"
              backSideButton={false}
            />
            {leader2 && (
              <div className="-ml-7">
                <CardImage
                  card={leader2}
                  cardVariantId={leader2 ? selectDefaultVariant(leader2) : undefined}
                  forceHorizontal={true}
                  size="w50"
                  backSideButton={false}
                />
              </div>
            )}
            <div className={cn({ '-ml-6': !!leader2 })}>
              <CardImage
                card={base}
                cardVariantId={base ? selectDefaultVariant(base) : undefined}
                forceHorizontal={true}
                size="w50"
                backSideButton={false}
              />
            </div>
          </div>
        );
      },
    });

    // Date column
    definitions.push({
      id: 'date',
      accessorKey: 'tournament.date',
      header: 'Date',
      displayBoxHeader: false,
      cell: ({ getValue }) => {
        const date = getValue() as string;

        return (
          <Button
            variant="link"
            className="flex flex-col gap-0 p-0 w-full items-start justify-center"
          >
            {dateRenderer(date)}
          </Button>
        );
      },
    });

    // Type column
    definitions.push({
      id: 'type',
      accessorKey: 'tournament.type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as keyof typeof tournamentTypesInfo;
        const typeInfo = tournamentTypesInfo[type];

        return (
          <div className="flex items-center gap-2">
            {typeInfo?.major === 1 && <Trophy className="h-4 w-4 text-amber-500" />}
            <span>{typeInfo?.name || type}</span>
          </div>
        );
      },
    });

    // Format column
    definitions.push({
      id: 'format',
      accessorKey: 'tournament.format',
      header: 'Format',
      cell: ({ getValue }) => {
        const format = getValue() as number;
        return <div>{formatDataById[format]?.name || 'Unknown'}</div>;
      },
    });

    // Location column
    definitions.push({
      id: 'location',
      accessorKey: 'tournament.location',
      header: 'Location',
      cell: ({ getValue, row }) => {
        const location = getValue() as string;
        const continent = row.original.tournament.continent;
        return (
          <div className="flex flex-col">
            <span>{location}</span>
            <span className="text-xs text-muted-foreground">{continent}</span>
          </div>
        );
      },
    });

    // Players column
    definitions.push({
      id: 'attendance',
      accessorKey: 'tournament.attendance',
      header: 'Players',
      cell: ({ getValue }) => {
        const attendance = getValue() as number;
        return <div className="text-center">{attendance}</div>;
      },
    });

    // Actions column
    definitions.push({
      id: 'actions',
      cell: ({ row }) => {
        const tournament = row.original.tournament;

        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconMedium" className="p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(
                    window.location.origin + '/tournaments/' + tournament.id,
                  )
                }
              >
                Copy link
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {canUpdate && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(tournament)}>
                  Edit tournament
                </DropdownMenuItem>
              )}

              {canDelete && onDelete && (
                <DropdownMenuItem onClick={() => onDelete(tournament)}>
                  Delete tournament
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return definitions;
  }, [canUpdate, canDelete, onEdit, onDelete, cardList]);
}
