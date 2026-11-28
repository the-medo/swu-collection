import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { useGetMetas } from '@/api/meta/useGetMetas.ts';
import { usePreviewPQMetaReassignment } from '@/api/tournaments/usePreviewPQMetaReassignment.ts';
import { useApplyPQMetaReassignment } from '@/api/tournaments/useApplyPQMetaReassignment.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  pqConstructedFormats,
  zPQMetaReassignmentRequest,
  type PQMetaChange,
  type PQMetaReassignmentPreview,
  type PQMetaReassignmentRequest,
  type PQMetaReassignmentResult,
} from '../../../../../../types/PQMetaReassignment.ts';

function Changes({ title, rows }: { title: string; rows: (PQMetaChange & { detail: string })[] }) {
  if (!rows.length) return null;
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer font-medium">
        {title} ({rows.length})
      </summary>
      <div className="mt-3 max-h-80 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / date</TableHead>
              <TableHead>Current meta</TableHead>
              <TableHead>New meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.id}-${index}`}>
                <TableCell>
                  <div>{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.detail}</div>
                </TableCell>
                <TableCell>{row.fromMetaName ?? 'No meta'}</TableCell>
                <TableCell>{row.toMetaName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

export function PQMetaReassignment({ onApplied }: { onApplied: () => void }) {
  const canAccess = usePermissions()('admin', 'access');
  const metas = useGetMetas({ limit: 500 });
  const previewMutation = usePreviewPQMetaReassignment();
  const applyMutation = useApplyPQMetaReassignment();
  const [preview, setPreview] = useState<{
    request: PQMetaReassignmentRequest;
    data: PQMetaReassignmentPreview;
  } | null>(null);
  const [result, setResult] = useState<PQMetaReassignmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = previewMutation.isPending || applyMutation.isPending;
  const resetPreview = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };
  const form = useForm({
    defaultValues: {
      fromDate: format(new Date(), 'yyyy-MM-dd'),
      premier: null as number | null,
      eternal: null as number | null,
    },
    onSubmit: async ({ value }) => {
      resetPreview();
      const parsed = zPQMetaReassignmentRequest.safeParse({
        fromDate: value.fromDate,
        targets: pqConstructedFormats.flatMap(f => {
          const metaId = f.id === 1 ? value.premier : value.eternal;
          return metaId === null ? [] : [{ formatId: f.id, metaId }];
        }),
      });
      if (!parsed.success) {
        setError('Choose a valid start date and at least one target meta.');
        return;
      }
      try {
        setPreview({ request: parsed.data, data: await previewMutation.mutateAsync(parsed.data) });
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Could not preview changes.');
      }
    },
  });
  const apply = async () => {
    if (!preview || busy) return;
    setError(null);
    try {
      setResult(
        await applyMutation.mutateAsync({
          ...preview.request,
          previewToken: preview.data.previewToken,
        }),
      );
      onApplied();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not apply changes. Preview again before retrying.',
      );
    } finally {
      setPreview(null);
      setConfirmOpen(false);
    }
  };
  if (!canAccess) return null;
  const changeCount = preview
    ? preview.data.tournaments.length +
      preview.data.groups.length +
      preview.data.weekendGroups.length
    : 0;
  return (
    <section className="space-y-4 rounded-lg border p-4" aria-labelledby="pq-reassign-heading">
      <div>
        <h2 id="pq-reassign-heading" className="text-xl font-semibold">
          Reassign PQ metas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Move existing constructed PQs from a date onward to a new meta for each format. PQ Week
          groups and live-weekend references move with them; week numbers and memberships stay the
          same.
        </p>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <fieldset disabled={busy || confirmOpen} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <form.Field
              name="fromDate"
              validators={{ onChange: zPQMetaReassignmentRequest.shape.fromDate }}
            >
              {field => (
                <div className="space-y-2">
                  <Label htmlFor="pq-reassign-date">From date (inclusive)</Label>
                  <Input
                    id="pq-reassign-date"
                    type="date"
                    required
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={e => {
                      field.handleChange(e.target.value);
                      resetPreview();
                    }}
                  />
                  <FormFieldError meta={field.state.meta} />
                </div>
              )}
            </form.Field>
            {pqConstructedFormats.map(f => (
              <form.Field key={f.id} name={f.id === 1 ? 'premier' : 'eternal'}>
                {field => (
                  <div className="space-y-2">
                    <Label htmlFor={`pq-reassign-${f.id}`}>{f.name} target meta</Label>
                    <Select
                      disabled={busy || confirmOpen || metas.isLoading || metas.isError}
                      value={field.state.value?.toString() ?? 'keep'}
                      onValueChange={value => {
                        field.handleChange(value === 'keep' ? null : Number(value));
                        resetPreview();
                      }}
                    >
                      <SelectTrigger id={`pq-reassign-${f.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Keep current metas</SelectItem>
                        {metas.data?.data
                          .filter(m => m.meta.format === f.id)
                          .map(m => (
                            <SelectItem key={m.meta.id} value={m.meta.id.toString()}>
                              {m.meta.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Sealed PQs keep their current metas. Empty PQ Week groups are skipped because they have
            no tournament dates.
          </p>
          {metas.isError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load metas.{' '}
              <Button type="button" variant="link" onClick={() => void metas.refetch()}>
                Retry
              </Button>
            </p>
          )}
          <Button type="submit" disabled={busy || confirmOpen || !metas.data}>
            {previewMutation.isPending ? 'Loading preview…' : 'Preview changes'}
          </Button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div role="status" className="space-y-2 rounded-md border p-3">
          <p>
            Updated {result.tournamentIds.length} PQs, {result.groupCount} PQ Week groups, and{' '}
            {result.weekendGroupCount} live-weekend references.
          </p>
          {result.warnings.map(w => (
            <p key={w} className="text-sm text-destructive">
              {w}
            </p>
          ))}
        </div>
      )}
      {preview && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Format / target</TableHead>
                <TableHead>PQs to change</TableHead>
                <TableHead>Already assigned</TableHead>
                <TableHead>PQ Week groups</TableHead>
                <TableHead>Weekend references</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.data.formats.map(row => (
                <TableRow key={row.formatId}>
                  <TableCell>
                    {pqConstructedFormats.find(f => f.id === row.formatId)?.name}
                    <div className="text-xs text-muted-foreground">{row.metaName}</div>
                  </TableCell>
                  <TableCell>{row.tournaments}</TableCell>
                  <TableCell>{row.alreadyAssigned}</TableCell>
                  <TableCell>{row.groups}</TableCell>
                  <TableCell>{row.weekendGroups}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            {preview.data.sealedCount} Sealed PQs remain unchanged.
          </p>
          {!!preview.data.conflicts.length && (
            <div role="alert" className="rounded-md border border-destructive p-3 text-sm">
              <p className="font-medium">Resolve these groups before applying:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {preview.data.conflicts.map((c, i) => (
                  <li key={`${c.groupId}-${i}`}>
                    {c.name}: {c.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Changes
            title="PQs"
            rows={preview.data.tournaments.map(t => ({
              ...t,
              detail: `${t.date}${t.imported ? ' · Imported; meta statistics will be refreshed' : ''}`,
            }))}
          />
          <Changes
            title="PQ Week groups"
            rows={preview.data.groups.map(g => ({
              ...g,
              detail: `${g.fromDate} – ${g.toDate} · ${g.tournamentCount} PQs`,
            }))}
          />
          <Changes
            title="Live-weekend references"
            rows={preview.data.weekendGroups.map(g => ({
              ...g,
              detail: `${g.weekendName} · ${g.date}`,
            }))}
          />
          {!changeCount && !preview.data.conflicts.length && (
            <p role="status" className="text-sm">
              No changes needed for these selections.
            </p>
          )}
          <Button
            type="button"
            disabled={busy || !changeCount || !!preview.data.conflicts.length}
            onClick={() => setConfirmOpen(true)}
          >
            Apply reassignment
          </Button>
        </div>
      )}
      <Dialog
        open={confirmOpen}
        onOpenChange={open => {
          if (!applyMutation.isPending) setConfirmOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign PQ metas?</DialogTitle>
            <DialogDescription>
              Apply the previewed changes from {preview?.request.fromDate}:{' '}
              {preview?.data.tournaments.length ?? 0} PQs, {preview?.data.groups.length ?? 0} PQ
              Week groups, and {preview?.data.weekendGroups.length ?? 0} live-weekend references.
              Sealed and earlier PQs stay unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={applyMutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={applyMutation.isPending} onClick={() => void apply()}>
              {applyMutation.isPending ? 'Applying…' : 'Confirm reassignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
