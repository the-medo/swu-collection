import { useUser } from '@/hooks/useUser.ts';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import { useCalendarPrivacy, useSetCalendarPrivacy } from '@/api/user/useCalendarPrivacy.ts';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  calendarPrivacyValues,
  calendarPrivacySchema,
} from '../../../../../../types/TournamentCalendar.ts';

const labels = { private: 'Private', unlisted: 'Unlisted', public: 'Public' };
const descriptions = {
  private: 'Only you. No one else, not even your teammates.',
  unlisted: 'You and your teammates.',
  public: 'Everyone, on your profile and in events.',
};

export function CalendarPrivacyControl() {
  const user = useUser();
  const query = useCalendarPrivacy();
  const mutation = useSetCalendarPrivacy();
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="calendar-privacy">Calendar privacy</Label>
          <InfoTooltip
            tooltip={
              <>
                <div className="space-y-2">
                  {calendarPrivacyValues.map(value => (
                    <p key={value} className="m-0 leading-snug!">
                      <strong>{labels[value]}:</strong> {descriptions[value]}
                    </p>
                  ))}
                </div>
                <p className="m-0 leading-snug!">
                  Attachments and home location always stay private. Calendar subscriptions keep
                  using your secret feed link.
                </p>
              </>
            }
          />
        </div>
        <Select
          value={query.data ?? ''}
          disabled={!user || query.isPending || query.isError || mutation.isPending}
          onValueChange={value => {
            if (user)
              mutation.mutate({ userId: user.id, privacy: calendarPrivacySchema.parse(value) });
          }}
        >
          <SelectTrigger id="calendar-privacy" className="w-36">
            <SelectValue placeholder={query.isError ? 'Unavailable' : 'Loading…'} />
          </SelectTrigger>
          <SelectContent>
            {calendarPrivacyValues.map(value => (
              <SelectItem key={value} value={value}>
                {labels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.error && (
        <p role="alert" className="max-w-sm break-words text-sm text-destructive">
          {query.error.message}{' '}
          <Button variant="link" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="max-w-sm break-words text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
