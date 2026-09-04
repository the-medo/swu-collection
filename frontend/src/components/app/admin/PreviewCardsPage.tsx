import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Copy,
  Download,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
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
  useArchiveActivePreviewCards,
  useArchivePreviewCard,
  useImportPreviewCard,
  useMigratePreviewCard,
  usePreviewCards,
  useSavePreviewCard,
  useUploadPreviewCardImage,
} from '@/api/admin/previewCards.ts';
import { transformToId } from '../../../../../lib/swu-resources/lib/transformToId.ts';

const PREVIEW_STATUSES: PreviewCardStatus[] = ['active', 'archived', 'migrated'];
const PREVIEW_CARD_IMPORT_DEFINITION_STORAGE_KEY =
  'swubase:admin:preview-cards:import-definition';

function loadStoredImportDefinition(): string {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(PREVIEW_CARD_IMPORT_DEFINITION_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeImportDefinition(definition: string): void {
  try {
    window.localStorage.setItem(PREVIEW_CARD_IMPORT_DEFINITION_STORAGE_KEY, definition);
  } catch {
    // Browser storage can be unavailable; importing should still work for the current page.
  }
}

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
  const archiveActivePreviewCards = useArchiveActivePreviewCards();
  const importPreviewCard = useImportPreviewCard();
  const migratePreviewCard = useMigratePreviewCard();
  const uploadPreviewCardImage = useUploadPreviewCardImage();

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [prefillTitle, setPrefillTitle] = useState('');
  const [prefillSubtitle, setPrefillSubtitle] = useState('');
  const [cardId, setCardId] = useState('');
  const [officialCardId, setOfficialCardId] = useState('');
  const [status, setStatus] = useState<PreviewCardStatus>('active');
  const [editorJson, setEditorJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [imageSide, setImageSide] = useState<'front' | 'back'>('front');
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [importSourceUrl, setImportSourceUrl] = useState('');
  const [importDefinitionJson, setImportDefinitionJson] = useState(loadStoredImportDefinition);

  const rows = data?.data ?? [];
  const template = data?.template;
  const selectedRow = rows.find(row => row.id === selectedId);
  const activeRowCount = rows.filter(row => row.status === 'active').length;

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
    setPrefillTitle(row.payload.title ?? '');
    setPrefillSubtitle(row.payload.subtitle ?? '');
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
    setPrefillTitle(payload?.title ?? '');
    setPrefillSubtitle(payload?.subtitle ?? '');
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
    setPrefillTitle(row.payload.title ?? '');
    setPrefillSubtitle(row.payload.subtitle ?? '');
    setCardId('');
    setOfficialCardId('');
    setStatus('active');
    setEditorJson(stringifyPayload({ ...row.payload, cardId: '' }));
    setJsonError(null);
    setSelectedVariantId(Object.keys(row.payload.variants ?? {})[0] ?? '');
  };

  const handlePrefill = () => {
    const title = prefillTitle.trim();
    const subtitle = prefillSubtitle.trim();

    if (!title) {
      toast({
        variant: 'destructive',
        title: 'Title is required',
      });
      return;
    }

    const payload = parseEditorPayload();
    if (!payload) return;

    const name = subtitle ? `${title}, ${subtitle}` : title;
    const nextCardId = transformToId(name);
    const nextVariantId = `${nextCardId}-preview-standard`;
    const draft = payload as any;
    const oldVariants = draft.variants ?? {};
    const oldVariantId =
      selectedVariantId && oldVariants[selectedVariantId]
        ? selectedVariantId
        : Object.keys(oldVariants)[0];
    const templateVariantId = Object.keys(template?.variants ?? {})[0];
    const oldVariant =
      (oldVariantId ? oldVariants[oldVariantId] : undefined) ??
      (templateVariantId ? template?.variants[templateVariantId] : undefined);
    const nextVariants = { ...oldVariants };

    if (oldVariantId && oldVariantId !== nextVariantId) {
      delete nextVariants[oldVariantId];
    }

    nextVariants[nextVariantId] = {
      ...oldVariant,
      variantId: nextVariantId,
      preview: true,
    };

    draft.cardId = nextCardId;
    draft.title = title;
    draft.subtitle = subtitle || undefined;
    draft.name = name;
    draft.variants = nextVariants;

    setCardId(nextCardId);
    setSelectedVariantId(nextVariantId);
    setEditorJson(stringifyPayload(draft));
    setJsonError(null);
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

  const handleArchiveActive = async () => {
    try {
      const archivedCount = await archiveActivePreviewCards.mutateAsync();
      if (selectedRow?.status === 'active') {
        setStatus('archived');
      }
      toast({
        title: 'Active preview cards archived',
        description: `${archivedCount} ${archivedCount === 1 ? 'card' : 'cards'} archived.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Bulk archive failed',
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleImport = async () => {
    storeImportDefinition(importDefinitionJson);

    try {
      const definition = JSON.parse(importDefinitionJson) as unknown;
      const payload = await importPreviewCard.mutateAsync({
        sourceUrl: importSourceUrl.trim(),
        definition,
      });
      startNew(payload);
      setCardId(payload.cardId);
      toast({ title: 'Preview card imported', description: 'Review the payload, then save it.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
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
            {rows.length} rows, {activeRowCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={activeRowCount === 0 || archiveActivePreviewCards.isPending}
              >
                {archiveActivePreviewCards.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                Archive all active
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive all active preview cards?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive {activeRowCount}{' '}
                  {activeRowCount === 1 ? 'preview card' : 'preview cards'} so they no longer appear
                  in the public card list. Migrated and already archived cards will not be changed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleArchiveActive}
                >
                  Archive all active
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

      <div className="space-y-3 rounded-md border p-4">
        <div>
          <h3 className="font-semibold">Import from external source</h3>
          <p className="text-sm text-muted-foreground">
            Paste a source URL and its private import definition. Imported images are uploaded
            immediately; review and save the generated payload afterward. The definition is saved
            only in this browser when you import.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,0.7fr)_minmax(420px,1.3fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="preview-card-import-url">Source URL</Label>
            <Input
              id="preview-card-import-url"
              value={importSourceUrl}
              onChange={event => setImportSourceUrl(event.target.value)}
              placeholder="https://example.com/cards/SET/123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-card-import-definition">Import definition JSON</Label>
            <Textarea
              id="preview-card-import-definition"
              value={importDefinitionJson}
              onChange={event => setImportDefinitionJson(event.target.value)}
              className="min-h-24 font-mono text-xs"
              placeholder='{"sourceUrlTemplate":"https://example.com/cards/{set}/{number}", ...}'
              spellCheck={false}
            />
          </div>
          <Button
            className="self-end"
            disabled={
              !importSourceUrl.trim() || !importDefinitionJson.trim() || importPreviewCard.isPending
            }
            onClick={handleImport}
          >
            {importPreviewCard.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Import
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
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="preview-card-title">Title</Label>
              <Input
                id="preview-card-title"
                value={prefillTitle}
                onChange={event => setPrefillTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preview-card-subtitle">Subtitle (optional)</Label>
              <Input
                id="preview-card-subtitle"
                value={prefillSubtitle}
                onChange={event => setPrefillSubtitle(event.target.value)}
              />
            </div>
            <Button className="self-end" variant="outline" onClick={handlePrefill}>
              <Sparkles className="mr-2 h-4 w-4" />
              Prefill
            </Button>
          </div>

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
