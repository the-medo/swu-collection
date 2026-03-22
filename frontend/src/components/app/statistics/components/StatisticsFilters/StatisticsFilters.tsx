import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import StatisticsDateRange from '@/components/app/statistics/components/StatisticsFilters/StatisticsDateRange/StatisticsDateRange.tsx';
import { DateRange } from 'react-day-picker';
import { useCallback, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import { useSession } from '@/lib/auth-client.ts';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { MoreHorizontal } from 'lucide-react';
import MatchTypeSelector, {
  MatchType,
} from '@/components/app/statistics/components/StatisticsFilters/MatchTypeSelector.tsx';
import { deleteGameResultsByScope } from '@/dexie/gameResults.ts';
import { clearGameResultsLastUpdatedInStorage } from '@/api/game-results/gameResultsCache.ts';
// import KarabastFormatSelect from './KarabastFormatSelect/KarabastFormatSelect.tsx';
// import { KarabastSwuGameFormat } from '../../../../../../../types/karabastTypes.ts';

interface StatisticsFiltersProps {
  teamId?: string;
}

const StatisticsFilters: React.FC<StatisticsFiltersProps> = ({ teamId }) => {
  const navigate = useNavigate();
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isClearingCache, setIsClearingCache] = useState(false);

  const {
    sFormatId,
    sDateRangeOption,
    sDateRangeFrom,
    sDateRangeTo,
    sInTeam,
    sMatchType,
    /*sKarabastFormat,*/
  } = useSearch({
    strict: false,
  });

  const dateRange = sDateRangeFrom
    ? {
        from: new Date(sDateRangeFrom),
        to: sDateRangeTo ? new Date(sDateRangeTo) : undefined,
      }
    : undefined;

  const scopeType = teamId ? 'team' : 'user';
  const scopeId = scopeType === 'team' ? teamId : session.data?.user.id;

  const onDateRangeOptionChange = useCallback(
    (optionId: string) => {
      navigate({
        to: '.',
        search: prev => ({ ...prev, sDateRangeOption: optionId }),
      });
    },
    [navigate],
  );

  const onDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      navigate({
        to: '.',
        search: prev => ({
          ...prev,
          sDateRangeFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
          sDateRangeTo: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
        }),
      });
    },
    [navigate],
  );

  const onClearMatchResultCache = useCallback(async () => {
    if (!scopeId || isClearingCache) {
      return;
    }

    setIsClearingCache(true);

    try {
      await deleteGameResultsByScope(scopeId);
      clearGameResultsLastUpdatedInStorage(scopeId);

      queryClient.getQueriesData({ queryKey: ['game-results', scopeId] }).forEach(([queryKey]) => {
        queryClient.setQueryData(queryKey, []);
      });

      await queryClient.invalidateQueries({ queryKey: ['game-results', scopeId] });

      toast({
        title: 'Match result cache cleared',
        description: 'Fresh results are being loaded for this scope.',
      });
    } catch {
      toast({
        title: 'Failed to clear match result cache',
        variant: 'destructive',
      });
    } finally {
      setIsClearingCache(false);
    }
  }, [isClearingCache, queryClient, scopeId, toast]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Match type:</span>
        <MatchTypeSelector
          value={(sMatchType as MatchType | undefined) ?? MatchType.ALL}
          onChange={matchType => {
            navigate({
              to: '.',
              search: prev => ({ ...prev, sMatchType: matchType }),
            });
          }}
        />
      </div>
      {teamId && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="inTeam" className="text-xs font-semibold">
            In-team only:
          </Label>
          <div className="flex gap-2">
            <Switch
              id="inTeam"
              checked={!!sInTeam}
              onCheckedChange={checked => {
                navigate({
                  to: '.',
                  search: prev => ({ ...prev, sInTeam: checked ? true : undefined }),
                });
              }}
            />
            <InfoTooltip tooltip="With this option, only games in between teammates are shown." />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Date range:</span>
        <StatisticsDateRange
          selectedOptionId={sDateRangeOption}
          dateRange={dateRange}
          onOptionChange={onDateRangeOptionChange}
          onDateRangeChange={onDateRangeChange}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Swubase deck format:</span>
        <FormatSelect
          value={sFormatId ?? null}
          onChange={formatId => {
            navigate({
              to: '.',
              search: prev => ({ ...prev, sFormatId: formatId ?? undefined }),
            });
          }}
          showInfoTooltip={false}
        />
      </div>
      {/* === Commented for now, as we will track games only for premier ===  */}
      {/*<div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Karabast game format:</span>
        <KarabastFormatSelect
          value={(sKarabastFormat as KarabastSwuGameFormat) ?? null}
          onChange={formatId => {
            navigate({
              to: '.',
              search: prev => ({ ...prev, sKarabastFormat: formatId ?? undefined }),
            });
          }}
        />
      </div>*/}
      <div className="flex items-end">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="iconMedium" aria-label="Statistics filter actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!scopeId || isClearingCache}
              onSelect={() => {
                void onClearMatchResultCache();
              }}
            >
              {isClearingCache ? 'Clearing match result cache...' : 'Clear match result cache'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default StatisticsFilters;
