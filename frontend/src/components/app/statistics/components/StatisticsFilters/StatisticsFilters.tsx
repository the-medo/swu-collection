import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import StatisticsDateRange from '@/components/app/statistics/components/StatisticsFilters/StatisticsDateRange/StatisticsDateRange.tsx';
import { DateRange } from 'react-day-picker';
import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
// import KarabastFormatSelect from './KarabastFormatSelect/KarabastFormatSelect.tsx';
// import { KarabastSwuGameFormat } from '../../../../../../../types/karabastTypes.ts';

interface StatisticsFiltersProps {
  teamId?: string;
}

const StatisticsFilters: React.FC<StatisticsFiltersProps> = ({ teamId }) => {
  const navigate = useNavigate();

  const {
    sFormatId,
    sDateRangeOption,
    sDateRangeFrom,
    sDateRangeTo,
    sInTeam,
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
    </div>
  );
};

export default StatisticsFilters;
