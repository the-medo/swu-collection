import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DatePickerProps {
  date: string | undefined; // ISO format yyyy-MM-dd
  onDateChange: (date: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  format?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  className,
  disabled = false,
  format: dateFormat = 'PPP',
}: DatePickerProps) {
  // Convert ISO string to Date for the calendar
  const dateValue = date ? new Date(date) : undefined;

  // Handle the date change by converting Date back to ISO string
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      // Format as yyyy-MM-dd to avoid timezone issues
      const isoDate = format(newDate, 'yyyy-MM-dd');
      onDateChange(isoDate);
    } else {
      onDateChange(undefined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? format(dateValue, dateFormat) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={dateValue} onSelect={handleDateChange} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
