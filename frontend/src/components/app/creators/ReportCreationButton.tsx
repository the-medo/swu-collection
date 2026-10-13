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
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { creatorKeys, hubApi, useHubQuery } from '@/api/creators';
import { useReportCreation } from '@/api/creators/reports.ts';
import { creationReportMaxLength } from '../../../../../shared/creators/reports.ts';

export function ReportCreationButton({ id }: { id: string }) {
  const user = useUser();
  return (
    <SignInWrapper text="Sign in to report as non-SWU">
      <ReportCreationDialog key={`${user?.id}:${id}`} id={id} />
    </SignInWrapper>
  );
}

function ReportCreationDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [clientReportId, setClientReportId] = useState(() => crypto.randomUUID());
  const inputId = useId();
  const status = useHubQuery(
    creatorKeys.reportStatus(id),
    () => hubApi.reportStatus(id),
    true,
    true,
  );
  const mutation = useReportCreation();
  const { toast } = useToast();
  const form = useForm({
    defaultValues: { details: '' },
    onSubmit: async ({ value }) => {
      if (mutation.isPending) return;
      try {
        await mutation.mutateAsync({ id, details: value.details.trim(), clientReportId });
        setOpen(false);
        toast({
          title: 'Report submitted',
          description: 'Thank you. An administrator will review this video.',
        });
      } catch {
        /* Keep the dialog and details available for a safe retry. */
      }
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (mutation.isPending) return;
        if (next) {
          mutation.reset();
          setClientReportId(crypto.randomUUID());
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={status.data?.reported || mutation.isSuccess}
          className="text-muted-foreground"
        >
          <Flag className="size-4" aria-hidden="true" />
          {status.data?.reported || mutation.isSuccess
            ? 'Reported as non-SWU'
            : 'Report as non-SWU'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report as non-SWU</DialogTitle>
          <DialogDescription>
            Tell us if this video is unrelated to Star Wars Unlimited. Reports are private and
            reviewed by administrators.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={event => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="details">
            {field => (
              <div className="grid gap-2">
                <Label htmlFor={inputId}>Additional details (optional)</Label>
                <Textarea
                  id={inputId}
                  maxLength={creationReportMaxLength}
                  rows={3}
                  value={field.state.value}
                  onChange={event => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  disabled={mutation.isPending}
                />
              </div>
            )}
          </form.Field>
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting…' : 'Submit report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
