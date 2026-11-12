import { Download, Printer } from 'lucide-react';
import { useSetChecklists } from '@/api/sets/useSetChecklists.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';

function Downloads({ set }: { set: SwuSet }) {
  const checklists = useSetChecklists(set);
  if (checklists.isError)
    return (
      <div role="alert">
        <p>Could not load the printable checklists.</p>
        <Button variant="link" onClick={() => void checklists.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (checklists.isPending || checklists.data === null)
    return <p role="status">Preparing printable PDFs…</p>;
  const files = checklists.data;
  if (!files.length) return <p>No official printings are available for this set yet.</p>;

  return (
    <div className="space-y-5">
      {(['Card grid', 'Printing list'] as const).map(layout => (
        <section key={layout} className="space-y-2">
          <h3 className="font-semibold">{layout}</h3>
          <p className="text-sm text-muted-foreground">
            {layout === 'Card grid'
              ? 'One row per card, with a box for each available printing.'
              : 'One row per printing, in two columns per page.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {files
              .filter(file => file.layout === layout)
              .map(file => (
                <Button key={file.url} variant="outline" size="sm" asChild>
                  <a
                    href={file.url}
                    download
                    aria-label={`Download ${layout}, ${file.paper === 'Letter' ? 'US Letter' : file.paper} PDF`}
                  >
                    <Download aria-hidden="true" />
                    {file.paper === 'Letter' ? 'US Letter' : file.paper}
                  </a>
                </Button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function SetChecklistDialog({ set }: { set: SwuSet }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative z-50"
          aria-label={`Printable checklists for ${setInfo[set].name}`}
        >
          <Printer aria-hidden="true" /> Printable checklists
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Printable checklists</DialogTitle>
          <DialogDescription>{setInfo[set].name}</DialogDescription>
        </DialogHeader>
        <Downloads set={set} />
      </DialogContent>
    </Dialog>
  );
}
