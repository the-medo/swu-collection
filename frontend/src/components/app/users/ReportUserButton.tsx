import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useReportUser } from '@/api/user/useReportUser.ts';
import { userReportMaxLength } from '../../../../../shared/types/userReports.ts';

export function ReportUserButton({
  userId,
  displayName,
  source,
}: {
  userId: string;
  displayName: string;
  source: 'profile' | 'conversation';
}) {
  const user = useUser();
  if (!user || user.id === userId || user.id === 'swubase' || userId === 'swubase') return null;
  return (
    <ReportUserDialog
      key={`${user.id}:${userId}:${source}`}
      userId={userId}
      displayName={displayName}
      source={source}
    />
  );
}

function ReportUserDialog({
  userId,
  displayName,
  source,
}: {
  userId: string;
  displayName: string;
  source: 'profile' | 'conversation';
}) {
  const [open, setOpen] = useState(false);
  const [clientReportId, setClientReportId] = useState(() => crypto.randomUUID());
  const inputId = useId();
  const mutation = useReportUser();
  const { toast } = useToast();
  const form = useForm({
    defaultValues: { description: '' },
    onSubmit: async ({ value }) => {
      if (mutation.isPending || !value.description.trim()) return;
      try {
        await mutation.mutateAsync({
          reportedUserId: userId,
          description: value.description.trim(),
          source,
          clientReportId,
        });
        setOpen(false);
        toast({
          title: 'Report submitted',
          description: 'Thank you. Your report has been sent for review.',
        });
      } catch {
        // Keep the reason and submission ID so a network retry cannot duplicate the report.
      }
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (mutation.isPending) return;
        if (next) {
          form.reset();
          mutation.reset();
          setClientReportId(crypto.randomUUID());
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0 text-destructive hover:text-destructive">
          <Flag aria-hidden="true" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words pr-6">Report {displayName}</DialogTitle>
          <DialogDescription>
            Describe what happened so a moderator can review it. Your report is not shared with this
            user.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="description">
            {field => (
              <div className="space-y-2">
                <Label htmlFor={inputId}>Reason for reporting</Label>
                <Textarea
                  id={inputId}
                  required
                  rows={5}
                  maxLength={userReportMaxLength}
                  value={field.state.value}
                  onChange={event => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  disabled={mutation.isPending}
                  placeholder="Explain why you are reporting this user…"
                />
                <p className="text-xs text-muted-foreground">
                  {field.state.value.length} / {userReportMaxLength}
                </p>
                {mutation.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {mutation.error.message}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending || !field.state.value.trim()}>
                    {mutation.isPending ? 'Submitting…' : 'Submit report'}
                  </Button>
                </div>
              </div>
            )}
          </form.Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
