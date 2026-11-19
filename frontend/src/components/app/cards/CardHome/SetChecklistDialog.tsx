import { Download, LoaderCircle } from 'lucide-react';
import { useSetChecklists } from '@/api/sets/useSetChecklists.ts';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import { PdfFileIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';
import SetLogo from './SetLogo.tsx';

const layouts = [
  {
    name: 'Card grid',
    description: 'One row per card, with a box for each printing.',
    preview: 'M6 14h22M6 19h22M6 24h22M6 29h22M6 34h22M16 14v20M22 14v20',
  },
  {
    name: 'Printing list',
    description: 'One row per printing, in two columns.',
    preview: 'M6 14h9m4 0h9M6 19h9m4 0h9M6 24h9m4 0h9M6 29h9m4 0h9M6 34h9m4 0h9',
  },
  {
    name: 'Printings by card',
    description: 'Each card appears once, with its printings listed underneath.',
    preview: 'M6 14h9m4 0h9M8 18h6m7 0h6M8 22h6m7 0h6M6 28h9m4 0h9M8 32h6m7 0h6M8 36h6m7 0h6',
  },
] as const;

const papers = [
  { name: 'A4', label: 'A4', dimensions: '210 × 297 mm' },
  { name: 'Letter', label: 'US Letter', dimensions: '8.5 × 11 in' },
] as const;

function LayoutPreview({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 34 44"
      fill="none"
      className="hidden h-11 w-[34px] shrink-0 sm:block"
    >
      <rect x="1" y="1" width="32" height="42" rx="3" className="fill-background stroke-border" />
      <path d="M6 8h12" stroke="currentColor" strokeWidth="2.5" />
      <path d={path} stroke="currentColor" opacity=".5" />
    </svg>
  );
}

function Downloads({ set }: { set: SwuSet }) {
  const checklists = useSetChecklists(set);
  if (checklists.isError)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm"
      >
        Could not load the checklists.
        <Button variant="outline" size="sm" onClick={() => void checklists.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (checklists.isPending || checklists.data === null)
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-5 text-sm text-muted-foreground"
      >
        <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" /> Preparing
        PDFs…
      </div>
    );
  const files = checklists.data;
  if (!files.length)
    return (
      <p className="text-sm text-muted-foreground">
        No official printings are available for this set yet.
      </p>
    );

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table aria-label="Checklist PDF downloads">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead scope="col" className="pl-3 text-xs sm:pl-4">
              Layout
            </TableHead>
            {papers.map(paper => (
              <TableHead
                key={paper.name}
                scope="col"
                className="w-16 whitespace-nowrap px-1 py-2.5 text-center sm:w-24"
              >
                <span className="block text-xs font-semibold text-foreground">{paper.label}</span>
                <span className="hidden text-[10px] font-normal sm:block">{paper.dimensions}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {layouts.map(layout => (
            <TableRow key={layout.name} className="hover:bg-transparent">
              <TableHead scope="row" className="py-3.5 pl-3 sm:py-4 sm:pl-4">
                <div className="flex items-center gap-3">
                  <LayoutPreview path={layout.preview} />
                  <div>
                    <span className="block font-semibold text-foreground">{layout.name}</span>
                    <span className="mt-1 block max-w-52 text-xs font-normal leading-snug">
                      {layout.description}
                    </span>
                  </div>
                </div>
              </TableHead>
              {papers.map(paper => {
                const file = files.find(
                  file => file.layout === layout.name && file.paper === paper.name,
                );
                const label = `Download ${layout.name}, ${paper.label} PDF`;
                return (
                  <TableCell key={paper.name} className="px-1 text-center">
                    {file ? (
                      <Button
                        asChild
                        variant="secondary"
                        size="icon"
                        className="size-10 rounded-lg bg-primary/12 text-foreground hover:bg-primary hover:text-primary-foreground dark:text-primary"
                      >
                        <a href={file.url} download aria-label={label} title={label}>
                          <Download aria-hidden="true" />
                        </a>
                      </Button>
                    ) : (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Unavailable</span>
                      </>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function SetChecklistDialog({
  set,
  artwork,
  className,
}: {
  set: SwuSet;
  artwork?: CardPrinting;
  className?: string;
}) {
  const info = setInfo[set];
  const label = `Printable PDF checklists for ${info.name}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="iconMedium"
          className={cn(
            'shrink-0 rounded-lg text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 [&_svg]:size-5',
            className,
          )}
          aria-label={label}
          title={label}
        >
          <PdfFileIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="block max-w-[35rem] rounded-2xl p-0 [&>button:last-child]:bg-black/60 [&>button:last-child]:text-white [&>button:last-child:hover]:bg-black/85">
        <div
          aria-hidden="true"
          className="relative isolate flex h-28 items-center overflow-hidden rounded-t-2xl bg-slate-950 px-5 text-white sm:h-32 sm:px-7"
          style={{
            backgroundImage: `linear-gradient(110deg, ${info.hexColor}50, transparent 75%)`,
          }}
        >
          {artwork && (
            <div className="absolute inset-y-0 right-0 -z-10 w-3/5 opacity-85 [mask-image:linear-gradient(to_right,transparent,black_55%)]">
              <CardArtCrop card={artwork.card} cardVariantId={artwork.variant.variantId} alt="" />
            </div>
          )}
          <SetLogo key={set} set={set} className="h-16 w-[54%] max-w-52 sm:h-20" />
        </div>
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <DialogHeader className="gap-1 pr-0">
            <DialogTitle>
              Printable checklists<span className="sr-only"> for {info.name}</span>
            </DialogTitle>
            <DialogDescription>Choose a layout and paper size.</DialogDescription>
          </DialogHeader>
          <Downloads set={set} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
