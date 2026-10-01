import { useCalendarWeekStart, useSetCalendarWeekStart } from '@/api/user/useCalendarWeekStart.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Label } from '@/components/ui/label.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { calendarWeekStartSchema } from '../../../../../../shared/lib/userSettings.ts';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function CalendarWeekStart() {
  const user = useUser();
  const query = useCalendarWeekStart();
  const mutation = useSetCalendarWeekStart();
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="calendar-week-start">Week starts on</Label>
        <Select
          value={String(query.data ?? 1)}
          disabled={!user || query.isPending || query.isError || mutation.isPending}
          onValueChange={value => {
            if (user)
              mutation.mutate({ userId: user.id, day: calendarWeekStartSchema.parse(value) });
          }}
        >
          <SelectTrigger id="calendar-week-start" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {days.map((day, index) => (
              <SelectItem key={day} value={String(index)}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.error && (
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}{' '}
          <Button variant="link" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
