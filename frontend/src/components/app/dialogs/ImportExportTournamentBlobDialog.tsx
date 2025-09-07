import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useForm } from '@tanstack/react-form';
import { AlertCircle, Database, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useImportTournamentFromBlob } from '@/api/tournaments/useImportTournamentFromBlob.ts';
import { useExportTournamentToBlob } from '@/api/tournaments/useExportTournamentToBlob.ts';

interface Props extends Pick<DialogProps, 'trigger' | 'triggerDisabled'> {
  tournamentId: string;
}

const ImportExportTournamentBlobDialog: React.FC<Props> = ({
  trigger,
  triggerDisabled,
  tournamentId,
}) => {
  const [open, setOpen] = useState(false);
  const importMutation = useImportTournamentFromBlob(tournamentId);
  const exportMutation = useExportTournamentToBlob(tournamentId);

  const form = useForm({
    defaultValues: {
      sourceTournamentId: tournamentId,
      markAsImported: true,
    },
    onSubmit: async ({ value }) => {
      if (value.sourceTournamentId) {
        importMutation.mutate(
          {
            sourceTournamentId: value.sourceTournamentId,
            markAsImported: value.markAsImported,
          },
          {
            onSuccess: () => setOpen(false),
          },
        );
      }
    },
  });

  const handleExport = () => {
    exportMutation.mutate(undefined as never, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header="Import/Export Tournament Data to Blob"
      open={open}
      onOpenChange={setOpen}
    >
      <div className="space-y-4">
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Blob Import/Export</AlertTitle>
          <AlertDescription>
            Export this tournament's decks, deck cards, deck information, and matches to blob
            storage, or import from another tournament previously exported.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export to Blob'}
          </Button>
        </div>

        <hr />

        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="sourceTournamentId"
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Source Tournament ID</Label>
                <Input
                  id={field.name}
                  placeholder="Enter source tournament id"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The tournament ID whose data exists in blob under data/tournaments/&lt;id&gt;.
                </p>
              </div>
            )}
          />
          <form.Field
            name="markAsImported"
            children={field => (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onCheckedChange={e => field.handleChange(!!e)}
                  />
                  <Label htmlFor={field.name}>Mark as imported</Label>
                </div>
              </div>
            )}
          />
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={importMutation.isPending}>
              <Database className="h-4 w-4 mr-2" />
              {importMutation.isPending ? 'Importing...' : 'Import from Blob'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default ImportExportTournamentBlobDialog;
