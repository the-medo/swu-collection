import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.tsx';
import { useGetTournamentGroups } from '@/api/tournament-groups/useGetTournamentGroups.ts';
import { usePostTournamentGroup } from '@/api/tournament-groups/usePostTournamentGroup.ts';
import { WeekData } from '@/components/app/admin/PQToolsPage/types.ts';
import { format, isSameMonth } from 'date-fns';
import { Button } from '@/components/ui/button.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast.ts';
import { api } from '@/lib/api.ts';
import { TournamentGroupWithMeta } from '../../../../../../types/TournamentGroup.ts';

interface PQWeeklyTournamentGroupsProps {
  weeklyTournaments: WeekData[];
  meta: number | null;
  format: number | null;
}

export function PQWeeklyTournamentGroups({
  weeklyTournaments,
  meta,
  format: formatId,
}: PQWeeklyTournamentGroupsProps) {
  // State to track which groups are currently adding tournaments
  const [addingTournamentsToGroup, setAddingTournamentsToGroup] = useState<Record<number, boolean>>(
    {},
  );

  // Fetch tournament groups for the given meta
  const tournamentGroupsQuery = useGetTournamentGroups({
    meta: meta || undefined,
    visible: false,
  });

  // Hook for creating tournament groups
  const createTournamentGroupMutation = usePostTournamentGroup();

  // Extract all tournament groups from the query result
  const allTournamentGroups = tournamentGroupsQuery.data?.pages.flatMap(page => page.data) || [];

  // Filter tournament groups that start with "PQ Week "
  const pqWeekGroups = allTournamentGroups.filter(group => group.group.name.startsWith('PQ Week '));

  // Format weekend dates in a nice way
  const formatWeekendDates = (startDate: Date | string) => {
    const start = new Date(startDate);

    // Find Saturday and Sunday of the week
    const saturday = new Date(start);
    const sunday = new Date(start);

    // Adjust to find the weekend
    saturday.setDate(start.getDate() + (6 - start.getDay())); // Saturday
    sunday.setDate(start.getDate() + (7 - start.getDay())); // Sunday

    if (isSameMonth(saturday, sunday)) {
      // Same month: "4th - 5th June"
      return `${format(saturday, 'do')} - ${format(sunday, 'do MMMM')}`;
    } else {
      // Different months: "31st May - 1st June"
      return `${format(saturday, 'do MMMM')} - ${format(sunday, 'do MMMM')}`;
    }
  };

  // Create a map of existing PQ Week groups by week number
  const existingWeekGroups = new Map<number, TournamentGroupWithMeta>();
  pqWeekGroups.forEach(group => {
    // Extract week number from group name (e.g., "PQ Week 1" -> 1)
    const weekNumberMatch = group.group.name.match(/PQ Week (\d+)/);
    if (weekNumberMatch && weekNumberMatch[1]) {
      const weekNumber = parseInt(weekNumberMatch[1], 10);
      existingWeekGroups.set(weekNumber, group);
    }
  });

  // Function to handle creating a tournament group
  const handleCreateGroup = (week: WeekData) => {
    if (!meta) {
      return;
    }

    const weekendDates = formatWeekendDates(week.startDate);

    createTournamentGroupMutation.mutate({
      name: `PQ Week ${week.weekNumber}`,
      metaId: meta,
      position: week.weekNumber * 10,
      description: weekendDates,
      visible: false,
    });
  };

  // Function to handle adding all missing tournaments to a group
  const handleAddMissingTournaments = async (
    week: WeekData,
    existingGroup: TournamentGroupWithMeta,
  ) => {
    if (!existingGroup || !existingGroup.group || !existingGroup.group.id) return;

    const groupId = existingGroup.group.id;

    // Mark this group as currently adding tournaments
    setAddingTournamentsToGroup(prev => ({ ...prev, [week.weekNumber]: true }));

    try {
      // Find all tournaments in this week that are not in the group
      const missingTournaments = week.tournaments.filter(tournament => {
        return !existingGroup.tournaments.some(
          groupTournament => groupTournament.tournament.id === tournament.tournament.id,
        );
      });

      if (missingTournaments.length === 0) {
        toast({
          title: 'No missing tournaments',
          description: 'All tournaments are already in the group.',
        });
        return;
      }

      // Add each missing tournament to the group
      for (let i = 0; i < missingTournaments.length; i++) {
        const tournament = missingTournaments[i];
        const response = await api['tournament-groups'][':id'].tournaments.$post({
          param: { id: groupId },
          json: {
            tournamentId: tournament.tournament.id,
            position: (i + 1) * 10, // Position based on array index * 10
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(
            'message' in errorData ? errorData.message : 'Failed to assign tournament to group',
          );
        }
      }

      // Invalidate the tournament groups query to refresh the data
      await tournamentGroupsQuery.refetch();

      toast({
        title: 'Tournaments added',
        description: `Added ${missingTournaments.length} tournaments to the group.`,
      });
    } catch (error) {
      console.error('Error adding tournaments to group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add tournaments to the group.',
      });
    } finally {
      // Mark this group as no longer adding tournaments
      setAddingTournamentsToGroup(prev => ({ ...prev, [week.weekNumber]: false }));
    }
  };

  return (
    <AccordionItem value="weekly-tournament-groups">
      <AccordionTrigger>PQ Tournament Groups</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Tournament Groups</h3>
          <p className="text-sm text-gray-500">
            {meta
              ? `Displaying PQ Week tournament groups for meta ID: ${meta}${formatId ? ` and format ID: ${formatId}` : ''}`
              : 'No meta selected. Please select a meta to view tournament groups.'}
          </p>

          {tournamentGroupsQuery.isLoading && <p>Loading tournament groups...</p>}

          {tournamentGroupsQuery.isError && (
            <p className="text-red-500">
              Error loading tournament groups: {tournamentGroupsQuery.error.message}
            </p>
          )}

          {tournamentGroupsQuery.isSuccess && allTournamentGroups.length === 0 && (
            <p>No tournament groups found for the selected meta.</p>
          )}

          {tournamentGroupsQuery.isSuccess && (
            <div className="space-y-6">
              {weeklyTournaments.map(week => {
                const existingGroup = existingWeekGroups.get(week.weekNumber);
                const bgColor = existingGroup ? 'bg-white' : 'bg-red-200';
                const weekendDates = formatWeekendDates(week.startDate);

                return (
                  <Collapsible key={week.weekNumber} className={`border rounded-md p-4 ${bgColor}`}>
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center text-left w-full">
                        <h4 className="text-md font-medium">
                          Week {week.weekNumber} ({weekendDates})
                        </h4>
                        <ChevronDown className="h-4 w-4 ml-2 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>

                      {!existingGroup && meta && (
                        <Button
                          size="sm"
                          onClick={() => handleCreateGroup(week)}
                          disabled={createTournamentGroupMutation.isPending}
                        >
                          {createTournamentGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                        </Button>
                      )}

                      {existingGroup && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddMissingTournaments(week, existingGroup)}
                          disabled={addingTournamentsToGroup[week.weekNumber]}
                          className="ml-2"
                        >
                          {addingTournamentsToGroup[week.weekNumber]
                            ? 'Adding...'
                            : 'Add Missing Tournaments'}
                          <Plus className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <p className="text-sm mt-2">
                      {existingGroup
                        ? `Group exists: ${existingGroup.group.name}`
                        : 'Missing group: PQ Week ' + week.weekNumber}
                    </p>

                    <CollapsibleContent className="mt-4">
                      <div className="pl-4 border-l-2 border-gray-200">
                        <h5 className="font-medium mb-2">Tournaments in this week:</h5>
                        <ul className="list-disc pl-6">
                          {week.tournaments.map(tournament => {
                            // Check if this tournament is in the tournament group
                            const isInGroup = existingGroup?.tournaments.some(
                              groupTournament =>
                                groupTournament.tournament.id === tournament.tournament.id,
                            );

                            // Apply red text color if the tournament is missing from the group
                            const textColor = existingGroup && !isInGroup ? 'text-red-500' : '';

                            return (
                              <li key={tournament.tournament.id} className={`text-sm ${textColor}`}>
                                {tournament.tournament.name} -{' '}
                                {format(new Date(tournament.tournament.date), 'MMM d, yyyy')}
                                {existingGroup && !isInGroup && ' (missing from group)'}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
