import { useEffect, useMemo, useState } from 'react';
import { Archive, Copy, Loader2, Plus, RefreshCcw, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
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
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { toast } from '@/hooks/use-toast.ts';
import {
  type AdminPreviewCardRow,
  type PreviewCardMigrationSummary,
  type PreviewCardPayload,
  type PreviewCardStatus,
  useArchivePreviewCard,
  useMigratePreviewCard,
  usePreviewCards,
  useSavePreviewCard,
  useUploadPreviewCardImage,
} from '@/api/admin/previewCards.ts';

const PREVIEW_STATUSES: PreviewCardStatus[] = ['active', 'archived', 'migrated'];

function stringifyPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

function statusBadgeVariant(status: PreviewCardStatus) {
  if (status === 'active') return 'success';
  if (status === 'migrated') return 'secondary';
  return 'outline';
}

function formatMigrationSummary(summary: PreviewCardMigrationSummary): string {
  const updates = [
    { label: 'leaders', count: summary.deckLeader1Updated + summary.deckLeader2Updated },
    { label: 'bases', count: summary.deckBaseUpdated },
    { label: 'deck cards', count: summary.deckCardsMerged },
    { label: 'card pool cards', count: summary.cardPoolCardsUpdated },
    { label: 'card pool leaders', count: summary.cardPoolLeadersUpdated },
    { label: 'collection cards', count: summary.collectionCardsMerged },
  ]
    .filter(update => update.count > 0)
    .map(update => `${update.count} ${update.label}`)
    .join(', ');

  return updates || 'No saved references needed rewriting.';
}

export function PreviewCardsPage() {
  const { data, isLoading, refetch } = usePreviewCards();
  const savePreviewCard = useSavePreviewCard();
  const archivePreviewCard = useArchivePreviewCard();
  const migratePreviewCard = useMigratePreviewCard();
  const uploadPreviewCardImage = useUploadPreviewCardImage();

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [cardId, setCardId] = useState('');
  const [officialCardId, setOfficialCardId] = useState('');
  const [status, setStatus] = useState<PreviewCardStatus>('active');
  const [editorJson, setEditorJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [imageSide, setImageSide] = useState<'front' | 'back'>('front');
  const [imageFile, setImageFile] = useState<File | undefined>();

  const rows = data?.data ?? [];
  const template = data?.template;
  const selectedRow = rows.find(row => row.id === selectedId);

  const parsedPayload = useMemo(() => {
    if (!editorJson.trim()) return undefined;
    try {
      return JSON.parse(editorJson) as PreviewCardPayload;
    } catch {
      return undefined;
    }
  }, [editorJson]);

  const variantIds = useMemo(() => Object.keys(parsedPayload?.variants ?? {}), [parsedPayload]);

  useEffect(() => {
    if (!editorJson && template) {
      startNew(template);
    }
  }, [editorJson, template]);

  useEffect(() => {
    if (variantIds.length > 0 && !variantIds.includes(selectedVariantId)) {
      setSelectedVariantId(variantIds[0] ?? '');
    }
  }, [selectedVariantId, variantIds]);

  const loadRow = (row: AdminPreviewCardRow) => {
    setSelectedId(row.id);
    setCardId(row.cardId);
    setOfficialCardId(row.officialCardId ?? '');
    setStatus(row.status);
    setEditorJson(stringifyPayload(row.payload));
    setJsonError(row.validationError);
    const firstVariant = Object.keys(row.payload.variants ?? {})[0] ?? '';
    setSelectedVariantId(firstVariant);
  };

  const startNew = (payload = template) => {
    setSelectedId(undefined);
    setCardId('');
    setOfficialCardId('');
    setStatus('active');
    setEditorJson(payload ? stringifyPayload(payload) : '');
    setJsonError(null);
    const firstVariant = Object.keys(payload?.variants ?? {})[0] ?? '';
    setSelectedVariantId(firstVariant);
    setImageFile(undefined);
  };

  const duplicateRow = (row: AdminPreviewCardRow) => {
    setSelectedId(undefined);
    setCardId('');
    setOfficialCardId('');
    setStatus('active');
    setEditorJson(stringifyPayload({ ...row.payload, cardId: '' }));
    setJsonError(null);
    setSelectedVariantId(Object.keys(row.payload.variants ?? {})[0] ?? '');
  };

  const parseEditorPayload = () => {
    try {
      const payload = JSON.parse(editorJson);
      setJsonError(null);
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setJsonError(message);
      return undefined;
    }
  };

  const handleSave = async () => {
    const payload = parseEditorPayload();
    if (!payload) return;

    try {
      const row = await savePreviewCard.mutateAsync({
        id: selectedId,
        cardId: cardId || undefined,
        status,
        officialCardId: officialCardId || null,
        payload,
      });
      loadRow(row);
      toast({ title: 'Preview card saved' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setJsonError(message);
      toast({ variant: 'destructive', title: 'Save failed', description: message });
    }
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    try {
      const row = await archivePreviewCard.mutateAsync(selectedId);
      loadRow(row);
      toast({ title: 'Preview card archived' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Archive failed',
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleMigrate = async () => {
    if (!selectedId || !officialCardId.trim()) return;
    try {
      const result = await migratePreviewCard.mutateAsync({
        id: selectedId,
        officialCardId: officialCardId.trim(),
      });
      loadRow(result.data);
      toast({
        title: 'Preview card migrated',
        description: formatMigrationSummary(result.migration),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Migrate failed',
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const injectImagePath = (image: string, horizontal: boolean) => {
    const payload = parseEditorPayload();
    if (!payload || !selectedVariantId) return;

    const draft = payload as any;
    draft.variants ??= {};
    draft.variants[selectedVariantId] ??= {};
    draft.variants[selectedVariantId].image ??= { front: '', back: null };
    draft.variants[selectedVariantId].image[imageSide] = image;
    draft.variants[selectedVariantId][imageSide] ??= {};
    draft.variants[selectedVariantId][imageSide].horizontal = horizontal;

    if (imageSide === 'front') {
      draft.front ??= {};
      draft.front.horizontal = horizontal;
    } else if (draft.back) {
      draft.back.horizontal = horizontal;
    }

    setEditorJson(stringifyPayload(draft));
  };

  const handleImageUpload = async () => {
    if (!selectedId || !imageFile) return;

    try {
      const result = await uploadPreviewCardImage.mutateAsync({
        id: selectedId,
        file: imageFile,
        side: imageSide,
        variantId: selectedVariantId,
      });
      injectImagePath(result.image, result.horizontal);
      setImageFile(undefined);
      toast({ title: 'Image uploaded', description: result.image });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const previewCard = parsedPayload?.variants?.[selectedVariantId] ? parsedPayload : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Preview Cards</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} rows, {rows.filter(row => row.status === 'active').length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => startNew()}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.9fr)_minmax(620px,1.4fr)]">
        <div className="rounded-md border">
          <ScrollArea className="h-[720px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading...</TableCell>
                  </TableRow>
                ) : null}
                {rows.map(row => (
                  <TableRow
                    key={row.id}
                    data-state={row.id === selectedId ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => loadRow(row)}
                  >
                    <TableCell>
                      <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.payload.name || row.cardId}</div>
                      <div className="text-xs text-muted-foreground">{row.cardId}</div>
                      {row.validationError ? (
                        <div className="mt-1 text-xs text-destructive">Invalid payload</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="iconSmall"
                          variant="ghost"
                          onClick={event => {
                            event.stopPropagation();
                            duplicateRow(row);
                          }}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="iconSmall"
                          variant="ghost"
                          onClick={event => {
                            event.stopPropagation();
                            loadRow(row);
                          }}
                          title="Edit"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_160px]">
            <div className="space-y-2">
              <Label htmlFor="preview-card-id">Card ID</Label>
              <Input
                id="preview-card-id"
                value={cardId}
                onChange={event => setCardId(event.target.value)}
                placeholder="derived from payload.name when blank"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={value => setStatus(value as PreviewCardStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREVIEW_STATUSES.map(value => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="official-card-id">Official Card ID</Label>
              <Input
                id="official-card-id"
                value={officialCardId}
                onChange={event => setOfficialCardId(event.target.value)}
                placeholder="official slug for migrated previews"
              />
            </div>
            <Button
              className="self-end"
              variant="outline"
              disabled={!selectedId || !officialCardId.trim() || migratePreviewCard.isPending}
              onClick={handleMigrate}
            >
              {migratePreviewCard.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Migrate
            </Button>
            <Button
              className="self-end"
              variant="destructive"
              disabled={!selectedId || archivePreviewCard.isPending}
              onClick={handleArchive}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </div>

          {jsonError ? (
            <Alert variant="destructive">
              <AlertTitle>JSON validation failed</AlertTitle>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-xs">{jsonError}</pre>
              </AlertDescription>
            </Alert>
          ) : null}

          {selectedRow?.validationError && !jsonError ? (
            <Alert variant="warning">
              <AlertTitle>Saved payload needs attention</AlertTitle>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-xs">{selectedRow.validationError}</pre>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <Label htmlFor="preview-card-json">Payload JSON</Label>
              <Textarea
                id="preview-card-json"
                value={editorJson}
                onChange={event => setEditorJson(event.target.value)}
                className="min-h-[620px] font-mono text-xs"
                spellCheck={false}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Variant</Label>
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variantIds.map(variantId => (
                      <SelectItem key={variantId} value={variantId}>
                        {variantId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center rounded-md border p-2">
                <CardImage card={previewCard} cardVariantId={selectedVariantId} size="w200" />
              </div>

              <div className="space-y-2">
                <Label>Image Side</Label>
                <Select
                  value={imageSide}
                  onValueChange={value => setImageSide(value as 'front' | 'back')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front">front</SelectItem>
                    <SelectItem value="back">back</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={event => setImageFile(event.target.files?.[0])}
              />

              <Button
                className="w-full"
                variant="outline"
                disabled={
                  !selectedId ||
                  !imageFile ||
                  !selectedVariantId ||
                  uploadPreviewCardImage.isPending
                }
                onClick={handleImageUpload}
              >
                {uploadPreviewCardImage.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload
              </Button>

              <Button className="w-full" disabled={savePreviewCard.isPending} onClick={handleSave}>
                {savePreviewCard.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
