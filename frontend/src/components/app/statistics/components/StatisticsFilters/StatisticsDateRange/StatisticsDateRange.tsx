import * as React from 'react';
import { format, subDays } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import { setInfo } from '../../../../../../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../../../../../../types/enums.ts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Calendar } from '@/components/ui/calendar.tsx';
import { cn } from '@/lib/utils.ts';

type StatisticsDateRangeOption = {
  id: string;
  label: string;
  fromDate: string;
  toDate: string;
  useToDate: boolean;
};

const todayDate = format(new Date(), 'yyyy-MM-dd');
const fromDateAshesOfTheEmpire = '2026-07-10'; // TODO - fix
const fromDateLaw = format(subDays(new Date(setInfo[SwuSet.LAW].releaseDate), 7), 'yyyy-MM-dd');
const fromDateSec = format(subDays(new Date(setInfo[SwuSet.SEC].releaseDate), 7), 'yyyy-MM-dd');

export const statisticsDateRangeOptions: Record<string, StatisticsDateRangeOption> = {
  last30days: {
    id: 'last30days',
    label: 'Last 30 days',
    fromDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    toDate: todayDate,
    useToDate: false,
  },
  last90days: {
    id: 'last90days',
    label: 'Last 90 days',
    fromDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    toDate: todayDate,
    useToDate: false,
  },
  setLaw: {
    id: 'setLaw',
    label: '[LAW] A Lawless Time',
    fromDate: fromDateLaw,
    toDate: fromDateAshesOfTheEmpire,
    useToDate: true,
  },
  setSec: {
    id: 'setSec',
    label: '[SEC] Secrets of Power',
    fromDate: fromDateSec,
    toDate: fromDateLaw,
    useToDate: true,
  },
};

const CUSTOM_OPTION_ID = 'custom';

interface StatisticsDateRangeProps {
  selectedOptionId?: string;
  dateRange: DateRange | undefined;
  onOptionChange: (optionId: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const StatisticsDateRange: React.FC<StatisticsDateRangeProps> = ({
  selectedOptionId = 'last30days',
  dateRange,
  onOptionChange,
  onDateRangeChange,
  className,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(dateRange?.from || new Date());

  const isCustom = selectedOptionId === CUSTOM_OPTION_ID;

  const handlePresetClick = (optionId: string) => {
    onOptionChange(optionId);

    if (optionId !== CUSTOM_OPTION_ID) {
      const option = statisticsDateRangeOptions[optionId];
      if (option) {
        const newRange: DateRange = {
          from: new Date(option.fromDate),
          to: new Date(option.toDate),
        };
        onDateRangeChange(newRange);
        setCurrentMonth(new Date(option.fromDate));
      }
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (isCustom) {
      onDateRangeChange(range);
    }
  };

  const getButtonLabel = (): string => {
    if (isCustom) {
      if (dateRange?.from && dateRange?.to) {
        return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
      }
      if (dateRange?.from) {
        return `${format(dateRange.from, 'MMM d, yyyy')} - ...`;
      }
      return 'Custom range';
    }

    const option = statisticsDateRangeOptions[selectedOptionId];
    return option?.label || 'Select date range';
  };

  const presetOptions = [
    { id: CUSTOM_OPTION_ID, label: 'Custom' },
    ...Object.values(statisticsDateRangeOptions),
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-start text-left font-normal', className)}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getButtonLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[430px] p-0" align="start">
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2 border-t p-3">
            {presetOptions.map(preset => (
              <Button
                key={preset.id}
                variant={selectedOptionId === preset.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeChange}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            numberOfMonths={2}
            disabled={!isCustom}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StatisticsDateRange;
