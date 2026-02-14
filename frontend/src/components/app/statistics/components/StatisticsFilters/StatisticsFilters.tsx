import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import KarabastFormatSelect from './KarabastFormatSelect/KarabastFormatSelect.tsx';
import StatisticsDateRange from '@/components/app/statistics/components/StatisticsFilters/StatisticsDateRange/StatisticsDateRange.tsx';
import { DateRange } from 'react-day-picker';
import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
import { KarabastSwuGameFormat } from '../../../../../../../types/karabastTypes.ts';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Label } from '@/components/ui/label.tsx';

interface StatisticsFiltersProps {
  teamId?: string;
}

const StatisticsFilters: React.FC<StatisticsFiltersProps> = ({ teamId }) => {
  const navigate = useNavigate();

  const { sFormatId, sDateRangeOption, sDateRangeFrom, sDateRangeTo, sKarabastFormat, sInTeam } =
    useSearch({
      strict: false,
    });

  const dateRange = sDateRangeFrom
    ? {
        from: new Date(sDateRangeFrom),
        to: sDateRangeTo ? new Date(sDateRangeTo) : undefined,
      }
    : undefined;

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

  return (
    <div className="flex gap-4">
      <StatisticsDateRange
        selectedOptionId={sDateRangeOption}
        dateRange={dateRange}
        onOptionChange={onDateRangeOptionChange}
        onDateRangeChange={onDateRangeChange}
      />
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
      <KarabastFormatSelect
        value={(sKarabastFormat as KarabastSwuGameFormat) ?? null}
        onChange={formatId => {
          navigate({
            to: '.',
            search: prev => ({ ...prev, sKarabastFormat: formatId ?? undefined }),
          });
        }}
      />
      {teamId && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="inTeam"
            checked={!!sInTeam}
            onCheckedChange={checked => {
              navigate({
                to: '.',
                search: prev => ({ ...prev, sInTeam: checked ? true : undefined }),
              });
            }}
          />
          <Label htmlFor="inTeam" className="text-sm whitespace-nowrap cursor-pointer">
            In-team only
          </Label>
        </div>
      )}
    </div>
  );
};

export default StatisticsFilters;
