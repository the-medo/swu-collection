import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useToast } from '@/hooks/use-toast';
import { useModerateReport } from '@/api/user-reports/useModerateReport';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  moderationActionLabels,
  moderationActionSchema,
  type ModerationActionInput,
  type ReportDetail,
} from '../../../../../../shared/types/userReportModeration';

export function ReportDecisionForm({ detail }: { detail: ReportDetail }) {
  const { toast } = useToast();
  const currentUser = useUser();
  const mutation = useModerateReport(detail.report.id);
  const [confirmation, setConfirmation] = useState<ModerationActionInput | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const form = useForm({
    defaultValues: {
      action: (detail.report.status === 'open'
        ? 'dismiss'
        : 'reopen') as ModerationActionInput['action'],
      target: 'reported' as ModerationActionInput['target'],
      reason: '',
      durationDays: 7,
    },
    onSubmit: async ({ value }) => {
      const parsed = moderationActionSchema.safeParse({
        ...value,
        clientActionId: requestId,
        revision: detail.report.revision,
        durationDays: value.action === 'suspend' ? value.durationDays : undefined,
      });
      if (!parsed.success) {
        toast({
          title: 'Check the decision',
          description: parsed.error.issues[0]?.message,
          variant: 'destructive',
        });
        return;
      }
      setConfirmation(parsed.data);
    },
  });
  const save = async () => {
    if (!confirmation) return;
    try {
      await mutation.mutateAsync(confirmation);
      toast({ title: 'Moderation decision saved.' });
      setConfirmation(null);
    } catch (error) {
      toast({
        title: 'Could not save decision',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    }
  };
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-base font-semibold">Admin decision</h3>
      <p className="text-sm text-muted-foreground">
        Assess the evidence and severity. A report alone is not proof of a violation.
      </p>
      <form
        onSubmit={event => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field name="target">
          {field => (
            <div className="space-y-1.5">
              <Label htmlFor="decision-target">Account to review</Label>
              <Select
                value={field.state.value}
                onValueChange={value => {
                  if (value === 'reported' || value === 'reporter') {
                    field.handleChange(value);
                    form.setFieldValue(
                      'action',
                      detail.report.status === 'open' ? 'dismiss' : 'reopen',
                    );
                  }
                }}
              >
                <SelectTrigger id="decision-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reported">
                    Reported user:{' '}
                    {detail.reported?.displayName ??
                      detail.report.reportedDisplayName ??
                      'Deleted user'}
                  </SelectItem>
                  <SelectItem value="reporter">
                    Reporter:{' '}
                    {detail.reporter?.displayName ??
                      detail.report.reporterDisplayName ??
                      'Deleted user'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={state => state.values.target}>
          {target => {
            const person = target === 'reported' ? detail.reported : detail.reporter;
            const canAct = person?.exists && !person.protected && person.id !== currentUser?.id;
            return (
              <form.Field name="action">
                {field => (
                  <div className="space-y-1.5">
                    <Label htmlFor="decision-action">Decision</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={value => {
                        if (value in moderationActionLabels)
                          field.handleChange(value as ModerationActionInput['action']);
                      }}
                    >
                      <SelectTrigger id="decision-action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {detail.report.status === 'open' ? (
                          <>
                            <SelectItem value="dismiss">Close without action</SelectItem>
                            {canAct && (
                              <>
                                <SelectItem value="suspend">Suspend account</SelectItem>
                                <SelectItem value="ban">Ban account</SelectItem>
                              </>
                            )}
                          </>
                        ) : (
                          <SelectItem value="reopen">Reopen report</SelectItem>
                        )}
                        {canAct && person.restriction !== 'none' && (
                          <SelectItem value="restore">Restore account access</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {!canAct && (
                      <p className="text-xs text-muted-foreground">
                        Account actions are unavailable for deleted accounts, admins, the system
                        account, and yourself.
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            );
          }}
        </form.Subscribe>
        <form.Subscribe selector={state => state.values.action}>
          {action => (
            <>
              {action === 'suspend' && (
                <form.Field name="durationDays">
                  {field => (
                    <div className="space-y-1.5">
                      <Label htmlFor="decision-days">Suspension length (days)</Label>
                      <Input
                        id="decision-days"
                        type="number"
                        min={1}
                        max={365}
                        step={1}
                        required
                        value={Number.isNaN(field.state.value) ? '' : field.state.value}
                        onBlur={field.handleBlur}
                        onChange={event => field.handleChange(event.target.valueAsNumber)}
                      />
                    </div>
                  )}
                </form.Field>
              )}
              {(action === 'suspend' || action === 'ban') && (
                <p className="text-sm text-destructive">
                  {action === 'ban'
                    ? 'The account will be blocked indefinitely.'
                    : 'The account will be blocked for the chosen duration.'}{' '}
                  Existing sessions will be revoked. Saving this decision resolves the report.
                </p>
              )}
              {action === 'restore' && (
                <p className="text-sm text-muted-foreground">
                  Removes the account’s current restriction, including restrictions from other
                  reports. Previous decisions stay in the history.
                </p>
              )}
            </>
          )}
        </form.Subscribe>
        <form.Field name="reason">
          {field => (
            <div className="space-y-1.5">
              <Label htmlFor="decision-reason">Reason for decision</Label>
              <Textarea
                id="decision-reason"
                required
                maxLength={2000}
                rows={4}
                placeholder="Record the evidence, severity, and reason for this decision."
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={event => field.handleChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Visible to admins. {field.state.value.length}/2000
              </p>
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={state => state.values.reason}>
          {reason => (
            <Button type="submit" disabled={!reason.trim() || mutation.isPending}>
              Review decision
            </Button>
          )}
        </form.Subscribe>
      </form>
      <Dialog
        open={!!confirmation}
        onOpenChange={open => {
          if (!open && !mutation.isPending) setConfirmation(null);
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg"
          onEscapeKeyDown={event => {
            if (mutation.isPending) event.preventDefault();
          }}
          onInteractOutside={event => {
            if (mutation.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Confirm decision</DialogTitle>
            <DialogDescription>
              This decision will be recorded in the report history.
            </DialogDescription>
          </DialogHeader>
          {confirmation && (
            <div className="min-w-0 space-y-2 text-sm">
              <p className="font-semibold">
                {moderationActionLabels[confirmation.action]}
                {confirmation.durationDays ? ` for ${confirmation.durationDays} days` : ''}
              </p>
              {['ban', 'suspend', 'restore'].includes(confirmation.action) && (
                <p className="break-words">
                  Account:{' '}
                  {
                    (confirmation.target === 'reported' ? detail.reported : detail.reporter)
                      ?.displayName
                  }
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{confirmation.reason}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmation?.action === 'ban' || confirmation?.action === 'suspend'
                  ? 'destructive'
                  : 'default'
              }
              disabled={mutation.isPending}
              onClick={() => void save()}
            >
              {mutation.isPending ? 'Saving…' : 'Confirm decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
